/**
 * Persist EVERY attributable iPOS EOD order into `ipos_orders` (TSK-155).
 *
 * Option B: stamps + BYO attribution are now gated on `profiles.phone_verified =
 * true` (Hieu's rule). To make that loss-less, we store every order parseEodOrders
 * keeps (one row per `tran_id`, always phone-bearing) regardless of whether a
 * verified account exists yet:
 *   - phone matches a VERIFIED profile → link `profile_id` at import time,
 *   - otherwise                        → store with `profile_id` NULL.
 * When the customer later verifies (lib/loyalty/backfill), the NULL rows are
 * linked onto their profile AND replayed into stamp_entries — so a later-verifier
 * reclaims both past stamps and BYO bowls. Orders with no usable date are skipped
 * (the column is NOT NULL and an undated order can't earn a dated stamp anyway).
 *
 * Idempotent on the iPOS `ipos_tran_id` (UNIQUE): re-importing the same file
 * inserts nothing new and never overwrites a `profile_id` linked since (we
 * insert-or-skip, we don't upsert columns).
 *
 * The core (`applyIposOrders`) talks to a tiny `IposOrderStore` port so it can be
 * unit tested against an in-memory fake; `createSupabaseIposOrderStore` is the
 * live adapter used by the import script.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedOrder } from "@/lib/ipos/parseEodOrders";

const IPOS_SOURCE = "ipos_eod";

/** Row written to `ipos_orders`. */
export type NewIposOrder = {
  ipos_tran_id: string;
  store_id: string;
  phone: string;
  profile_id: string | null;
  ordered_at: string;
  source: string;
};

export type InsertResult = { ok: true } | { ok: false; duplicate: boolean };

/** The narrow set of DB operations `applyIposOrders` needs. */
export interface IposOrderStore {
  /**
   * Resolve a VERIFIED profile id by phone, or null when the phone has no
   * verified web account (so the order is stored unlinked, to back-fill later).
   */
  findVerifiedProfileIdByPhone(phone: string): Promise<string | null>;
  /** Insert one order; reports a duplicate `ipos_tran_id` rather than throwing. */
  insertOrder(order: NewIposOrder): Promise<InsertResult>;
}

export type ApplyIposOrdersSummary = {
  orders: number;
  inserted: number;
  /** Already persisted (idempotency hit). */
  skippedExisting: number;
  /** Skipped because the order had no usable date (ordered_at is NOT NULL). */
  skippedUndated: number;
  /** Persisted with a verified profile_id linked at import time. */
  linkedToProfile: number;
  /** Persisted with profile_id NULL (unverified / unmatched — back-fills later). */
  unlinked: number;
  errors: number;
};

/**
 * Persist the given attributable orders. Safe to re-run: orders whose
 * `ipos_tran_id` was already stored are skipped, not duplicated.
 */
export async function applyIposOrders(
  store: IposOrderStore,
  orders: ParsedOrder[],
): Promise<ApplyIposOrdersSummary> {
  const summary: ApplyIposOrdersSummary = {
    orders: orders.length,
    inserted: 0,
    skippedExisting: 0,
    skippedUndated: 0,
    linkedToProfile: 0,
    unlinked: 0,
    errors: 0,
  };

  // Cache phone → verified-profile lookups; one customer repeats many orders.
  const profileCache = new Map<string, string | null>();
  const profileFor = async (phone: string): Promise<string | null> => {
    if (profileCache.has(phone)) return profileCache.get(phone)!;
    const id = await store.findVerifiedProfileIdByPhone(phone);
    profileCache.set(phone, id);
    return id;
  };

  for (const order of orders) {
    // 1. Undated orders can't be persisted (ordered_at is NOT NULL).
    if (order.tran_date === null) {
      summary.skippedUndated++;
      continue;
    }

    // 2. Link to a verified account when the phone matches; else store unlinked.
    const profileId = await profileFor(order.phone);

    // 3. Insert (idempotent on ipos_tran_id).
    const res = await store.insertOrder({
      ipos_tran_id: order.tran_id,
      store_id: order.store_id,
      phone: order.phone,
      profile_id: profileId,
      ordered_at: new Date(order.tran_date).toISOString(),
      source: IPOS_SOURCE,
    });

    if (!res.ok) {
      if (res.duplicate) summary.skippedExisting++;
      else summary.errors++;
      continue;
    }

    summary.inserted++;
    if (profileId) summary.linkedToProfile++;
    else summary.unlinked++;
  }

  return summary;
}

/* ───────────────────────── Supabase adapter ───────────────────────── */

/** Postgres unique-violation. */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Live `IposOrderStore` backed by a (service-role) Supabase client.
 *
 * Targets the TSK-155 schema: `ipos_orders.ipos_tran_id` (unique). The verified
 * gate is `profiles.phone_verified = true` (Hieu's rule) — a phone present on a
 * profile no longer counts on its own.
 */
export function createSupabaseIposOrderStore(supabase: SupabaseClient): IposOrderStore {
  return {
    async findVerifiedProfileIdByPhone(phone) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .eq("phone_verified", true)
        .maybeSingle();
      return data?.id ?? null;
    },

    async insertOrder(order) {
      const { error } = await supabase.from("ipos_orders").insert(order);
      if (!error) return { ok: true };
      return { ok: false, duplicate: error.code === PG_UNIQUE_VIOLATION };
    },
  };
}
