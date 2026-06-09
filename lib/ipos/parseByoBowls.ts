/**
 * iPOS C03 ("hoá đơn theo thời gian") export → archived Build-Your-Own bowls
 * (TSK-153, Part A).
 *
 * WHY JSON (not the .xls): each `sale_detail` line is one bowl, and a
 * Build-Your-Own line carries its OWN nested `toppings[]`. The .xls flattens
 * those toppings into sibling rows with no parent link, so two BYO bowls in one
 * order become an unrecoverable soup. The JSON keeps each bowl's ingredients
 * nested, so an order with N BYO lines splits cleanly into N bowls.
 *
 * Pure + testable: no DB, no network. Hand it the parsed JSON of one store's
 * EOD file plus that store's resolved `stores.id`; it returns one `ByoBowl` per
 * BYO `sale_detail` line, each with its own ingredient list. Modifiers
 * (cutlery, pour-in dressing — the `SERVICE_` item class) are kept but flagged
 * `is_modifier` so the recs layer can ignore them. Phones are normalised with
 * the SAME TSK-148 `normalizeIposPhone`; a bowl with no attributable phone is
 * still archived (phone = null) for aggregate trends.
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

/** One ingredient line inside a BYO bowl. */
export type ByoIngredient = {
  /** iPOS item id (e.g. "ITEM-BASE_001", "SERVICE_801"). The recs key. */
  item_id: string | null;
  item_name: string;
  /** Line quantity, preserved as-is (defaults to 1 when absent/malformed). */
  quantity: number;
  /**
   * True when this line is a service modifier (no cutlery, pour-in dressing…)
   * rather than a real food ingredient. Detected by the `SERVICE_` item class,
   * NOT by matching Vietnamese names, so new modifiers flag automatically.
   */
  is_modifier: boolean;
};

/** One archived Build-Your-Own bowl, ready for `applyByoBowls`. */
export type ByoBowl = {
  /** iPOS order id (the whole transaction). Many bowls can share it. */
  ipos_tran_id: string;
  /** iPOS `sale_detail` line id — UNIQUE per bowl, the idempotency key. */
  ipos_line_id: string;
  /** Resolved Tossful `stores.id`. */
  store_id: string;
  /** Canonical "0XXXXXXXXX" phone, or null when not attributable. */
  phone: string | null;
  /** Order time as ISO-8601, or null when the export had no usable date. */
  ordered_at: string | null;
  ingredients: ByoIngredient[];
};

export type ByoParseStats = {
  /** Order records seen in the file. */
  ordersRead: number;
  /** Orders dropped because store_uid was missing / mismatched. */
  droppedWrongStore: number;
  /** BYO `sale_detail` lines seen (before the line-id check). */
  byoLinesFound: number;
  /** Bowls emitted (had a usable line id). */
  bowlsParsed: number;
  /** BYO lines dropped because they had no usable line id. */
  droppedNoLineId: number;
  /** Bowls whose phone normalised to a real customer mobile. */
  attributable: number;
  /** Bowls archived with phone = null (aggregate trends only). */
  phoneless: number;
  /** Bowls with no usable order date (apply skips these — ordered_at NOT NULL). */
  undated: number;
  /** Distinct attributable phones across the file. */
  distinctPhones: number;
  /** Total ingredient lines flagged is_modifier. */
  modifierIngredients: number;
  /** Total real (non-modifier) ingredient lines. */
  realIngredients: number;
  /** Distinct modifier item ids discovered — the "classes" flagged. */
  modifierItemIds: string[];
};

export type ByoParseResult = {
  bowls: ByoBowl[];
  stats: ByoParseStats;
};

type RawRecord = Record<string, unknown>;

/** Build-Your-Own marker. Robust to the VN encoding by keying on the EN half. */
const BYO_MARKER = "BUILD YOUR OWN";

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

/** A line is a BYO bowl when its item_type_name contains "BUILD YOUR OWN". */
function isByoLine(line: RawRecord): boolean {
  const typeName = asString(line.item_type_name) ?? "";
  return typeName.toUpperCase().includes(BYO_MARKER);
}

/**
 * True when a topping is a service modifier rather than a food ingredient.
 * The `SERVICE_` prefix on `item_id` (or a SERVICE class/type id) is the tell —
 * we deliberately do NOT match Vietnamese names, so a new modifier added later
 * (another "no cutlery"-style line) is flagged without a code change.
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

function parseIngredients(line: RawRecord): RawRecord[] {
  const t = line.toppings;
  return Array.isArray(t) ? (t as RawRecord[]) : [];
}

/**
 * Parse one store's EOD export into archived BYO bowls.
 *
 * @param raw               Parsed JSON of the EOD file (array or common envelope).
 * @param storeId           Resolved `stores.id` to stamp every bowl with.
 * @param expectedStoreUid  iPOS `store_uid` this file should contain; orders
 *                          with a different/missing uid are dropped.
 */
export function parseByoBowls(
  raw: unknown,
  storeId: string,
  expectedStoreUid: string,
): ByoParseResult {
  const records = extractOrderArray(raw);
  const stats: ByoParseStats = {
    ordersRead: records.length,
    droppedWrongStore: 0,
    byoLinesFound: 0,
    bowlsParsed: 0,
    droppedNoLineId: 0,
    attributable: 0,
    phoneless: 0,
    undated: 0,
    distinctPhones: 0,
    modifierIngredients: 0,
    realIngredients: 0,
    modifierItemIds: [],
  };

  const bowls: ByoBowl[] = [];
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
      if (!line || typeof line !== "object" || !isByoLine(line)) continue;
      stats.byoLinesFound++;

      const lineId = asString(line.id)?.trim() || null;
      if (!lineId || !tranId) {
        stats.droppedNoLineId++;
        continue;
      }

      const ingredients: ByoIngredient[] = parseIngredients(line).map((t) => {
        const itemId = asString(t.item_id)?.trim() || null;
        const isModifier = isModifierLine(t);
        if (isModifier) {
          stats.modifierIngredients++;
          if (itemId) modifierIds.add(itemId);
        } else {
          stats.realIngredients++;
        }
        return {
          item_id: itemId,
          item_name: asString(t.item_name)?.trim() || "(unknown)",
          quantity: asQuantity(t.quantity),
          is_modifier: isModifier,
        };
      });

      bowls.push({
        ipos_tran_id: tranId,
        ipos_line_id: lineId,
        store_id: storeId,
        phone,
        ordered_at: orderedAt,
        ingredients,
      });
      stats.bowlsParsed++;
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
  return { bowls, stats };
}
