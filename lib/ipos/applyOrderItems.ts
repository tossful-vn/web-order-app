/**
 * Capture parsed iPOS order items into Postgres (TSK-172).
 *
 * Mirrors the BYO archive (applyByoBowls) MINUS the ingredients sub-table — an
 * order item is a single flat row. Keeps EVERY line it can attribute to a line
 * id, even ones with no web account, so the recs layer has aggregate trends as
 * well as per-customer history:
 *   - phone matches a phone_verified `profiles` row → link `profile_id`,
 *   - phone present but no verified account → keep the phone, `profile_id` null,
 *   - no attributable phone                 → capture anyway, phone + profile null.
 * Lines with no usable order date are skipped (ordered_at is NOT NULL and an
 * undated row is useless for trends).
 *
 * Idempotent on the iPOS `ipos_line_id` (UNIQUE): re-importing the same file
 * inserts nothing new. A duplicate line id is reported, not thrown.
 *
 * The core (`applyOrderItems`) talks to a tiny `OrderItemStore` port so it can be
 * unit tested against an in-memory fake; `createSupabaseOrderItemStore` is the
 * live adapter used by the import script.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderItem } from "@/lib/ipos/parseOrderItems";

/** Row written to `ipos_order_items`. */
export type NewOrderItem = {
  ipos_tran_id: string;
  ipos_line_id: string;
  profile_id: string | null;
  phone: string | null;
  store_id: string;
  ordered_at: string;
  item_id: string | null;
  item_name: string;
  item_type_name: string | null;
  quantity: number;
  is_modifier: boolean;
};

export type InsertItemResult =
  | { ok: true }
  | { ok: false; duplicate: boolean };

/** The narrow set of DB operations `applyOrderItems` needs. */
export interface OrderItemStore {
  /** Resolve a `profiles.id` by phone, or null when the phone has no account. */
  findProfileIdByPhone(phone: string): Promise<string | null>;
  /** True when this iPOS line was already captured (idempotency). */
  hasItemForLineId(lineId: string): Promise<boolean>;
  /** Insert one item; reports a duplicate line id rather than throwing. */
  insertItem(item: NewOrderItem): Promise<InsertItemResult>;
}

export type ApplyOrderItemsSummary = {
  items: number;
  inserted: number;
  /** Already captured (idempotency hit). */
  skippedExisting: number;
  /** Skipped because the line had no usable order date. */
  skippedUndated: number;
  /** Items linked to a web account (phone matched a profile). */
  linkedToProfile: number;
  /** Items captured with a phone but no matching account. */
  phoneOnly: number;
  /** Items captured with no attributable phone. */
  anonymous: number;
  errors: number;
};

/**
 * Capture the given order items. Safe to re-run: items whose `ipos_line_id` was
 * already captured are skipped, not duplicated.
 */
export async function applyOrderItems(
  store: OrderItemStore,
  items: OrderItem[],
): Promise<ApplyOrderItemsSummary> {
  const summary: ApplyOrderItemsSummary = {
    items: items.length,
    inserted: 0,
    skippedExisting: 0,
    skippedUndated: 0,
    linkedToProfile: 0,
    phoneOnly: 0,
    anonymous: 0,
    errors: 0,
  };

  // Cache phone → profile lookups; one customer can have many lines.
  const profileCache = new Map<string, string | null>();
  const profileFor = async (phone: string): Promise<string | null> => {
    if (profileCache.has(phone)) return profileCache.get(phone)!;
    const id = await store.findProfileIdByPhone(phone);
    profileCache.set(phone, id);
    return id;
  };

  for (const item of items) {
    // 1. Undated items can't be captured (ordered_at is NOT NULL + useless).
    if (!item.ordered_at) {
      summary.skippedUndated++;
      continue;
    }

    // 2. Idempotency: never re-capture a line we've already stored.
    if (await store.hasItemForLineId(item.ipos_line_id)) {
      summary.skippedExisting++;
      continue;
    }

    // 3. Link to a web account when the phone matches; otherwise keep the phone.
    const profileId = item.phone ? await profileFor(item.phone) : null;

    // 4. Insert the item (idempotent on ipos_line_id).
    const res = await store.insertItem({
      ipos_tran_id: item.ipos_tran_id,
      ipos_line_id: item.ipos_line_id,
      profile_id: profileId,
      phone: item.phone,
      store_id: item.store_id,
      ordered_at: item.ordered_at,
      item_id: item.item_id,
      item_name: item.item_name,
      item_type_name: item.item_type_name,
      quantity: item.quantity,
      is_modifier: item.is_modifier,
    });

    if (!res.ok) {
      if (res.duplicate) summary.skippedExisting++;
      else summary.errors++;
      continue;
    }

    summary.inserted++;
    if (profileId) summary.linkedToProfile++;
    else if (item.phone) summary.phoneOnly++;
    else summary.anonymous++;
  }

  return summary;
}

/* ───────────────────────── Supabase adapter ───────────────────────── */

/** Postgres unique-violation. */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Live `OrderItemStore` backed by a (service-role) Supabase client.
 *
 * Targets the TSK-172 schema: `ipos_order_items.ipos_line_id` (unique).
 */
export function createSupabaseOrderItemStore(supabase: SupabaseClient): OrderItemStore {
  return {
    async findProfileIdByPhone(phone) {
      // Link an item to an account ONLY when the phone matches a profile with
      // phone_verified = true. Unverified/unmatched items are still captured
      // phone-only (profile_id NULL) and linked later on verify (backfill).
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .eq("phone_verified", true)
        .maybeSingle();
      return data?.id ?? null;
    },

    async hasItemForLineId(lineId) {
      const { data } = await supabase
        .from("ipos_order_items")
        .select("id")
        .eq("ipos_line_id", lineId)
        .limit(1)
        .maybeSingle();
      return !!data;
    },

    async insertItem(item) {
      const { error } = await supabase.from("ipos_order_items").insert(item);
      if (!error) return { ok: true };
      return { ok: false, duplicate: error.code === PG_UNIQUE_VIOLATION };
    },
  };
}
