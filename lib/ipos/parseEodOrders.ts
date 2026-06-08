/**
 * iPOS end-of-day (C03 "hoá đơn theo thời gian") export → attributable orders
 * for the Magic Stamp sync (TSK-148).
 *
 * Pure + testable: no DB, no network. Hand it the parsed JSON of one store's
 * EOD file plus that store's resolved `stores.id`; it returns one row per
 * order that can earn a stamp (mapped store + a real customer phone) and a
 * stats breakdown for the import summary. Unattributable orders (GrabFood
 * placeholder phone, blanks, wrong store) are dropped.
 */
import { normalizeIposPhone } from "@/lib/ipos/normalizePhone";

/** iPOS `store_uid` → human label. The caller maps `store_uid` → `stores.id`. */
export const IPOS_STORE_UIDS = {
  HN: "d5c47a65-3660-469c-ad13-3861a972b56f",
  HCM: "8c3d96d2-f6ce-4712-9eaf-db89c5ace5ba",
} as const;

/** One attributable order, ready for `applyStamps`. */
export type ParsedOrder = {
  /** iPOS unique order id — the idempotency key. */
  tran_id: string;
  /** Human invoice number, for spot-checks / logs. */
  tran_no: string | null;
  /** Resolved Tossful `stores.id`. */
  store_id: string;
  /** Canonical "0XXXXXXXXX" phone key (collides with `profiles.phone`). */
  phone: string;
  /** Order time as epoch milliseconds (iPOS `tran_date`). */
  tran_date: number | null;
};

export type ParseStats = {
  /** Total order records seen in the file. */
  read: number;
  /** Orders that belong to the expected store_uid AND have a real phone. */
  attributable: number;
  /** Dropped because store_uid was missing / did not match `expectedStoreUid`. */
  droppedWrongStore: number;
  /** Dropped because the phone was a placeholder / blank / malformed. */
  droppedNoPhone: number;
  /** Dropped because the record had no usable `tran_id`. */
  droppedNoTranId: number;
  /** Attributable rows sharing a tran_id already seen earlier in the file. */
  duplicateTranIds: number;
};

export type ParseResult = {
  orders: ParsedOrder[];
  stats: ParseStats;
};

type RawOrder = Record<string, unknown>;

/**
 * Locate the order array inside a parsed EOD JSON. The C03 export is an array
 * of order objects, but exporters sometimes wrap it (`{ data: [...] }` etc.),
 * so we probe the common envelopes rather than assume a bare array.
 */
export function extractOrderArray(raw: unknown): RawOrder[] {
  if (Array.isArray(raw)) return raw as RawOrder[];
  if (raw && typeof raw === "object") {
    for (const key of ["data", "rows", "result", "results", "orders", "items"]) {
      const v = (raw as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v as RawOrder[];
    }
  }
  return [];
}

/** `extra_data` may arrive as a nested object or a JSON-encoded string. */
function readExtraData(order: RawOrder): Record<string, unknown> {
  const ed = order.extra_data;
  if (ed && typeof ed === "object") return ed as Record<string, unknown>;
  if (typeof ed === "string" && ed.trim()) {
    try {
      const parsed = JSON.parse(ed);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  return {};
}

function asString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function asEpochMs(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/**
 * Parse one store's EOD export into attributable orders.
 *
 * @param raw            Parsed JSON of the EOD file (array or common envelope).
 * @param storeId        Resolved `stores.id` to stamp every attributable order with.
 * @param expectedStoreUid  The iPOS `store_uid` this file should contain; rows
 *                          with a different/missing uid are dropped (guards
 *                          against importing the wrong file against a store).
 */
export function parseEodOrders(
  raw: unknown,
  storeId: string,
  expectedStoreUid: string,
): ParseResult {
  const records = extractOrderArray(raw);
  const stats: ParseStats = {
    read: records.length,
    attributable: 0,
    droppedWrongStore: 0,
    droppedNoPhone: 0,
    droppedNoTranId: 0,
    duplicateTranIds: 0,
  };

  const orders: ParsedOrder[] = [];
  const seen = new Set<string>();

  for (const rec of records) {
    if (!rec || typeof rec !== "object") {
      stats.droppedNoTranId++;
      continue;
    }

    const tran_id = asString(rec.tran_id)?.trim() || null;
    if (!tran_id) {
      stats.droppedNoTranId++;
      continue;
    }

    const storeUid = asString(rec.store_uid)?.trim() || null;
    if (storeUid !== expectedStoreUid) {
      stats.droppedWrongStore++;
      continue;
    }

    const extra = readExtraData(rec);
    const phone = normalizeIposPhone(asString(extra.customer_phone));
    if (!phone) {
      stats.droppedNoPhone++;
      continue;
    }

    // Attributable. De-dup within the file so a re-exported duplicate row does
    // not double-count even before the DB idempotency key.
    if (seen.has(tran_id)) {
      stats.duplicateTranIds++;
      continue;
    }
    seen.add(tran_id);

    stats.attributable++;
    orders.push({
      tran_id,
      tran_no: asString(rec.tran_no),
      store_id: storeId,
      phone,
      tran_date: asEpochMs(rec.tran_date),
    });
  }

  return { orders, stats };
}
