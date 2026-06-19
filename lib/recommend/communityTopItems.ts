/**
 * Community best-sellers aggregation (TSK-173 PR1).
 *
 * This is the REFERENCE implementation of the `community_top_items` SQL function
 * (2026-06-19_community-top-items.sql). In production the read route calls the
 * SECURITY DEFINER RPC so the aggregate can see every order row without exposing
 * other customers' rows; this pure function mirrors that SQL's semantics exactly
 * so the contract — aggregation maths, the modifier/no-id filters, the ordering,
 * and crucially the NO-PII output shape — is unit-testable against fixtures.
 *
 * Keep the two in lockstep: any change here must be mirrored in the .sql, and
 * vice-versa.
 */

/** A row of `ipos_order_items` as the aggregator sees it. PII fields may be
 *  present on the source row but are NEVER read into the output. */
export type OrderItemRow = {
  ipos_tran_id: string;
  store_id: string | null;
  ordered_at: string; // ISO-8601
  item_id: string | null;
  item_name: string;
  item_type_name: string | null;
  quantity: number;
  is_modifier: boolean;
  /** PII — present on the table, must never reach the output. */
  phone?: string | null;
  /** PII — present on the table, must never reach the output. */
  profile_id?: string | null;
};

/** One aggregated best-seller. No PII by construction. */
export type CommunityTopItem = {
  item_id: string;
  item_name: string;
  item_type_name: string | null;
  total_qty: number;
  order_count: number;
};

export type AggregateOptions = {
  /** Restrict to one store; omit/undefined for all stores. */
  storeId?: string | null;
  /** Rolling-window start (inclusive). Defaults to 30 days before now. */
  since?: Date;
  /** Max rows returned. Defaults to 5; negative clamps to 0. */
  limit?: number;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Aggregate raw order-item rows into the community best-sellers list.
 * Mirrors `public.community_top_items`.
 */
export function aggregateCommunityTopItems(
  rows: OrderItemRow[],
  options: AggregateOptions = {},
): CommunityTopItem[] {
  const storeId = options.storeId ?? null;
  const sinceMs = (options.since ?? new Date(Date.now() - THIRTY_DAYS_MS)).getTime();
  const limit = Math.max(options.limit ?? 5, 0);

  // Group by item_id, accumulating qty, distinct orders, and the lexical-max
  // name/type (matching SQL max(text), which is deterministic across duplicates).
  const groups = new Map<
    string,
    { name: string; type: string | null; qty: number; orders: Set<string> }
  >();

  for (const r of rows) {
    if (r.is_modifier) continue; // exclude service modifiers (No Cutlery, etc.)
    if (r.item_id == null) continue; // a best-seller must map to a menu/BYO entry
    if (new Date(r.ordered_at).getTime() < sinceMs) continue; // outside window
    if (storeId !== null && r.store_id !== storeId) continue; // store filter

    const g = groups.get(r.item_id);
    if (!g) {
      groups.set(r.item_id, {
        name: r.item_name,
        type: r.item_type_name,
        qty: r.quantity,
        orders: new Set([r.ipos_tran_id]),
      });
    } else {
      g.qty += r.quantity;
      g.orders.add(r.ipos_tran_id);
      if (r.item_name > g.name) g.name = r.item_name;
      if ((r.item_type_name ?? "") > (g.type ?? "")) g.type = r.item_type_name;
    }
  }

  const items: CommunityTopItem[] = Array.from(groups.entries()).map(
    ([item_id, g]) => ({
      item_id,
      item_name: g.name,
      item_type_name: g.type,
      total_qty: g.qty,
      order_count: g.orders.size,
    }),
  );

  // total_qty DESC, then order_count DESC (matches the SQL ORDER BY).
  items.sort(
    (a, b) => b.total_qty - a.total_qty || b.order_count - a.order_count,
  );

  return items.slice(0, limit);
}
