/**
 * Apply Magic Stamps from parsed iPOS EOD orders (TSK-148).
 *
 * One attributable order → one stamp. Stamps land on the customer's stamp card,
 * keyed by their canonical phone: if a web account exists for that phone the
 * card is owned by that user; otherwise the card is recorded against the phone
 * alone so it can be back-filled to the user when they sign up.
 *
 * Idempotent on the iPOS `tran_id`: every stamp_entry carries `ipos_tran_id`
 * (unique) and `source='ipos_eod'`, so re-importing the same file inserts
 * nothing new. The 8-slot punch-card semantics are preserved — a full card
 * rolls to `reward_ready` and the next order opens a fresh collecting card.
 * NO redemption happens here (reward_choice / redeemed are never touched).
 *
 * The core (`applyStamps`) talks to a tiny `StampStore` port so it can be unit
 * tested against an in-memory fake; `createSupabaseStampStore` is the live
 * adapter used by the import script.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { INGREDIENT_POOL } from "@/lib/types/loyalty";
import type { ParsedOrder } from "@/lib/ipos/parseEodOrders";

const MAX_STAMPS = 8;
const IPOS_SOURCE = "ipos_eod";
const REWARD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Owner of a stamp card: a web-account user when known, always a phone key. */
export type CardOwner = { userId: string | null; phone: string };

export type CardRow = {
  id: string;
  stamps_collected: number;
  reward_status: string;
};

export type NewEntry = {
  card_id: string;
  stamp_number: number;
  ingredient_key: string;
  earned_at: string;
  ipos_tran_id: string;
  source: string;
};

export type InsertResult = { ok: true } | { ok: false; duplicate: boolean };

/** The narrow set of DB operations `applyStamps` needs. */
export interface StampStore {
  /** Resolve a web account (`profiles.id` = `auth.users.id`) by phone, or null. */
  findUserIdByPhone(phone: string): Promise<string | null>;
  /** True if a stamp_entry already exists for this iPOS order (idempotency). */
  hasEntryForTranId(tranId: string): Promise<boolean>;
  /** The owner's current `collecting` card with room left, or null. */
  findCollectingCard(owner: CardOwner): Promise<CardRow | null>;
  /** Open a fresh `collecting` card for the owner. */
  createCard(owner: CardOwner): Promise<CardRow>;
  /** Insert a stamp; reports a duplicate iPOS tran_id rather than throwing. */
  insertEntry(entry: NewEntry): Promise<InsertResult>;
  /** Advance card progress; mark `reward_ready` when it fills. NO redemption. */
  updateCardProgress(
    cardId: string,
    stampsCollected: number,
    full: boolean,
    earnedAt: string,
  ): Promise<void>;
}

export type ApplyStampsSummary = {
  attributable: number;
  inserted: number;
  skippedExisting: number;
  newCards: number;
  linkedToProfile: number;
  phoneOnly: number;
  errors: number;
};

/** Deterministic ingredient for a slot — mirrors the existing add_test_stamp. */
function ingredientForStamp(stampNumber: number): string {
  return stampNumber >= MAX_STAMPS
    ? "mascot"
    : INGREDIENT_POOL[(stampNumber - 1) % INGREDIENT_POOL.length];
}

/** Stable order: chronological by `tran_date`, then `tran_id` (nulls last). */
function sortOrders(orders: ParsedOrder[]): ParsedOrder[] {
  return [...orders].sort((a, b) => {
    const ta = a.tran_date ?? Number.MAX_SAFE_INTEGER;
    const tb = b.tran_date ?? Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return a.tran_id < b.tran_id ? -1 : a.tran_id > b.tran_id ? 1 : 0;
  });
}

/**
 * Apply stamps for the given attributable orders. Safe to re-run: orders whose
 * `tran_id` was already imported are skipped, not double-counted.
 */
export async function applyStamps(
  store: StampStore,
  orders: ParsedOrder[],
): Promise<ApplyStampsSummary> {
  const summary: ApplyStampsSummary = {
    attributable: orders.length,
    inserted: 0,
    skippedExisting: 0,
    newCards: 0,
    linkedToProfile: 0,
    phoneOnly: 0,
    errors: 0,
  };

  for (const order of sortOrders(orders)) {
    // 1. Idempotency: never re-stamp an order we've already imported.
    if (await store.hasEntryForTranId(order.tran_id)) {
      summary.skippedExisting++;
      continue;
    }

    // 2. Resolve owner (web account if the phone is registered, else phone-only).
    const userId = await store.findUserIdByPhone(order.phone);
    const owner: CardOwner = { userId, phone: order.phone };

    // 3. Find the open collecting card, or roll to a fresh one.
    let card = await store.findCollectingCard(owner);
    if (!card || card.stamps_collected >= MAX_STAMPS) {
      card = await store.createCard(owner);
      summary.newCards++;
    }

    const nextStamp = card.stamps_collected + 1;
    const earnedAt = order.tran_date
      ? new Date(order.tran_date).toISOString()
      : new Date().toISOString();

    // 4. Insert the stamp. A duplicate tran_id here means a concurrent/re-run
    //    insert beat us — treat as already-imported, not an error.
    const res = await store.insertEntry({
      card_id: card.id,
      stamp_number: nextStamp,
      ingredient_key: ingredientForStamp(nextStamp),
      earned_at: earnedAt,
      ipos_tran_id: order.tran_id,
      source: IPOS_SOURCE,
    });

    if (!res.ok) {
      if (res.duplicate) {
        summary.skippedExisting++;
      } else {
        summary.errors++;
      }
      continue;
    }

    summary.inserted++;
    if (userId) summary.linkedToProfile++;
    else summary.phoneOnly++;

    // 5. Advance the card; fill → reward_ready (next order opens a new card).
    await store.updateCardProgress(card.id, nextStamp, nextStamp >= MAX_STAMPS, earnedAt);
  }

  return summary;
}

/* ───────────────────────── Supabase adapter ───────────────────────── */

/** Postgres unique-violation. */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Live `StampStore` backed by a (service-role) Supabase client.
 *
 * Targets the TSK-148 schema: `stamp_cards.user_id` nullable + `phone` column,
 * `stamp_entries.ipos_tran_id` (unique) + `source`. See the migration in the
 * PR / README before running against a project that hasn't applied it.
 */
export function createSupabaseStampStore(supabase: SupabaseClient): StampStore {
  return {
    async findUserIdByPhone(phone) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      return data?.id ?? null;
    },

    async hasEntryForTranId(tranId) {
      const { data } = await supabase
        .from("stamp_entries")
        .select("id")
        .eq("ipos_tran_id", tranId)
        .limit(1)
        .maybeSingle();
      return !!data;
    },

    async findCollectingCard(owner) {
      let q = supabase
        .from("stamp_cards")
        .select("id, stamps_collected, reward_status")
        .eq("reward_status", "collecting")
        .lt("stamps_collected", MAX_STAMPS)
        .order("created_at", { ascending: false })
        .limit(1);
      // Prefer the user-owned card when registered; otherwise the phone card.
      q = owner.userId ? q.eq("user_id", owner.userId) : q.is("user_id", null).eq("phone", owner.phone);
      const { data } = await q.maybeSingle();
      return (data as CardRow | null) ?? null;
    },

    async createCard(owner) {
      const { data, error } = await supabase
        .from("stamp_cards")
        .insert({ user_id: owner.userId, phone: owner.phone })
        .select("id, stamps_collected, reward_status")
        .single();
      if (error || !data) {
        throw new Error(`createCard failed: ${error?.message ?? "no row returned"}`);
      }
      return data as CardRow;
    },

    async insertEntry(entry) {
      const { error } = await supabase.from("stamp_entries").insert(entry);
      if (!error) return { ok: true };
      return { ok: false, duplicate: error.code === PG_UNIQUE_VIOLATION };
    },

    async updateCardProgress(cardId, stampsCollected, full, earnedAt) {
      const fields: Record<string, unknown> = { stamps_collected: stampsCollected };
      if (full) {
        fields.reward_status = "reward_ready";
        fields.reward_earned_at = earnedAt;
        fields.reward_expires_at = new Date(
          new Date(earnedAt).getTime() + REWARD_TTL_MS,
        ).toISOString();
      }
      const { error } = await supabase.from("stamp_cards").update(fields).eq("id", cardId);
      if (error) throw new Error(`updateCardProgress failed: ${error.message}`);
    },
  };
}
