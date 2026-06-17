/**
 * iPOS C03 ("hoá đơn theo thời gian") export → captured order items (TSK-172).
 *
 * WHY: the repo imports iPOS EOD two ways — parseEodOrders → applyIposOrders /
 * applyStamps (order-level) and parseByoBowls → applyByoBowls (BYO bowls only).
 * NEITHER keeps signature / menu-item sales, so community best-sellers and a
 * customer's favourite bowl can't be computed. This mirrors the BYO pipeline but
 * emits ONE row per `sale_detail` line for ALL item types (not only BUILD YOUR
 * OWN), so every sale is captured at line granularity.
 *
 * Pure + testable: no DB, no network. Hand it the parsed JSON of one store's EOD
 * file plus that store's resolved `stores.id`; it returns one `OrderItem` per
 * `sale_detail` line. Service modifiers (cutlery, pour-in dressing — the
 * `SERVICE_` item class) are kept but flagged `is_modifier` so the recs layer can
 * ignore them. Phones are normalised with the SAME TSK-148 `normalizeIposPhone`;
 * a line with no attributable phone is still captured (phone = null) for trends.
 */
import { normalizeIposPhone } from "@/lib/ipos/normalizePhone";
import {
  asEpochMs,
  asString,
  extractOrderArray,
  readExtraData,
} from "@/lib/ipos/parseEodOrders";

/** Re-export so callers map `store_uid` → `stores.id` from one place. */
export { IPOS_STORE_UIDS } from "@/lib/ipos/parseEodOrders";

/** One captured iPOS sale line, ready for `applyOrderItems`. */
export type OrderItem = {
  /** iPOS order id (the whole transaction). Many lines can share it. */
  ipos_tran_id: string;
  /** iPOS `sale_detail` line id — UNIQUE per line, the idempotency key. */
  ipos_line_id: string;
  /** Resolved Tossful `stores.id`. */
  store_id: string;
  /** Canonical "0XXXXXXXXX" phone, or null when not attributable. */
  phone: string | null;
  /** Order time as ISO-8601, or null when the export had no usable date. */
  ordered_at: string | null;
  /** iPOS item id (e.g. "ITEM-SIG_004", "SERVICE_801"). The recs key. */
  item_id: string | null;
  item_name: string;
  /** iPOS item type / category name, kept as-is for grouping. */
  item_type_name: string | null;
  /** Line quantity, preserved as-is (defaults to 1 when absent/malformed). */
  quantity: number;
  /**
   * True when this line is a service modifier (no cutlery, pour-in dressing…)
   * rather than a real menu item. Detected by the `SERVICE_` item class, NOT by
   * matching Vietnamese names, so a new modifier flags automatically.
   */
  is_modifier: boolean;
};

export type OrderItemsParseStats = {
  /** Order records seen in the file. */
  ordersRead: number;
  /** Orders dropped because store_uid was missing / mismatched. */
  droppedWrongStore: number;
  /** `sale_detail` lines seen (before the line-id check). */
  linesFound: number;
  /** Items emitted (had a usable line id + tran id). */
  itemsParsed: number;
  /** Lines dropped because they had no usable line id (or no order tran id). */
  droppedNoLineId: number;
  /** Items whose phone normalised to a real customer mobile. */
  attributable: number;
  /** Items captured with phone = null (aggregate trends only). */
  phoneless: number;
  /** Items with no usable order date (apply skips these — ordered_at NOT NULL). */
  undated: number;
  /** Distinct attributable phones across the file. */
  distinctPhones: number;
  /** Lines flagged is_modifier. */
  modifierLines: number;
  /** Real (non-modifier) menu lines. */
  realLines: number;
  /** Distinct modifier item ids discovered — the "classes" flagged. */
  modifierItemIds: string[];
};

export type OrderItemsParseResult = {
  items: OrderItem[];
  stats: OrderItemsParseStats;
};

type RawRecord = Record<string, unknown>;

/** Service modifier class tell: item id (or class id) starts with `SERVICE`. */
const SERVICE_CLASS = /^SERVICE/i;

/**
 * Locate the `sale_detail` line array inside one order. The C03 export nests
 * lines under `sale_detail`, but exporters vary, so we probe the common names.
 */
function extractLines(order: RawRecord): RawRecord[] {
  for (const key of ["sale_detail", "sale_details", "details", "order_detail", "items"]) {
    const v = order[key];
    if (Array.isArray(v)) return v as RawRecord[];
  }
  return [];
}

/**
 * True when a line is a service modifier rather than a real menu item. The
 * `SERVICE_` prefix on `item_id` (or a SERVICE class/type id) is the tell — we
 * deliberately do NOT match Vietnamese names, so a new modifier added later (an
 * extra "no cutlery"-style line) is flagged without a code change.
 */
function isModifierLine(line: RawRecord): boolean {
  const itemId = asString(line.item_id) ?? "";
  if (SERVICE_CLASS.test(itemId)) return true;
  const classId = asString(line.item_class_id) ?? asString(line.item_type_id) ?? "";
  return SERVICE_CLASS.test(classId);
}

function asQuantity(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Parse one store's EOD export into captured order items.
 *
 * @param raw               Parsed JSON of the EOD file (array or common envelope).
 * @param storeId           Resolved `stores.id` to stamp every item with.
 * @param expectedStoreUid  iPOS `store_uid` this file should contain; orders with
 *                          a different/missing uid are dropped.
 */
export function parseOrderItems(
  raw: unknown,
  storeId: string,
  expectedStoreUid: string,
): OrderItemsParseResult {
  const records = extractOrderArray(raw);
  const stats: OrderItemsParseStats = {
    ordersRead: records.length,
    droppedWrongStore: 0,
    linesFound: 0,
    itemsParsed: 0,
    droppedNoLineId: 0,
    attributable: 0,
    phoneless: 0,
    undated: 0,
    distinctPhones: 0,
    modifierLines: 0,
    realLines: 0,
    modifierItemIds: [],
  };

  const items: OrderItem[] = [];
  const phones = new Set<string>();
  const modifierIds = new Set<string>();

  for (const rec of records) {
    if (!rec || typeof rec !== "object") continue;

    const storeUid = asString(rec.store_uid)?.trim() || null;
    if (storeUid !== expectedStoreUid) {
      stats.droppedWrongStore++;
      continue;
    }

    const tranId = asString(rec.tran_id)?.trim() || null;
    const extra = readExtraData(rec);
    const phone = normalizeIposPhone(asString(extra.customer_phone));
    const tranMs = asEpochMs(rec.tran_date);
    const orderedAt = tranMs === null ? null : new Date(tranMs).toISOString();

    for (const line of extractLines(rec)) {
      if (!line || typeof line !== "object") continue;
      stats.linesFound++;

      const lineId = asString(line.id)?.trim() || null;
      if (!lineId || !tranId) {
        stats.droppedNoLineId++;
        continue;
      }

      const itemId = asString(line.item_id)?.trim() || null;
      const isModifier = isModifierLine(line);
      if (isModifier) {
        stats.modifierLines++;
        if (itemId) modifierIds.add(itemId);
      } else {
        stats.realLines++;
      }

      items.push({
        ipos_tran_id: tranId,
        ipos_line_id: lineId,
        store_id: storeId,
        phone,
        ordered_at: orderedAt,
        item_id: itemId,
        item_name: asString(line.item_name)?.trim() || "(unknown)",
        item_type_name: asString(line.item_type_name)?.trim() || null,
        quantity: asQuantity(line.quantity),
        is_modifier: isModifier,
      });
      stats.itemsParsed++;
      if (orderedAt === null) stats.undated++;
      if (phone) {
        stats.attributable++;
        phones.add(phone);
      } else {
        stats.phoneless++;
      }
    }
  }

  stats.distinctPhones = phones.size;
  stats.modifierItemIds = [...modifierIds].sort();
  return { items, stats };
}
