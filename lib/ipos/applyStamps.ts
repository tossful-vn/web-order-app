/**
 * Apply Magic Stamps from parsed iPOS EOD orders (TSK-148, gate updated TSK-155).
 *
 * Magic Stamp accrual STARTS at phone verification (Hieu's final rule). An iPOS
 * order earns a stamp only when its phone matches a `profiles` row where
 *   1. `phone_verified = true` AND `phone_verified_at IS NOT NULL`, and
 *   2. `order.ordered_at >= phone_verified_at`.
 * Orders placed BEFORE verification NEVER earn — there are no retroactive stamps.
 * A phone merely *present* on a profile (the older phone-OTP signup path) does not
 * count until the customer retro-verifies via Zalo OTP (TSK-149). Every order is
 * still persisted in `ipos_orders` (applyIposOrders) for BYO/preference linking,
 * but pre-verification orders are never stamped — not at import, not on verify.
 *
 * Idempotent on the iPOS `tran_id`: every stamp_entry carries `ipos_tran_id`
 * (unique) and `source='ipos_eod'`, so re-importing the same file inserts
 * nothing new. The 8-slot punch-card semantics are preserved — a full card
 * rolls to `reward_ready` and the next order opens a fresh collecting card.
 * NO redemption happens here.
 *
 * The core (`applyStamps`) talks to a tiny `StampStore` port so it can be unit
 * tested against an in-memory fake; `createSupabaseStampStore` is the live
 * adapter used by the import script.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { INGREDIENT_POOL, STAMPS_REQUIRED } from "@/lib/types/loyalty";
import type { ParsedOrder } from "@/lib/ipos/parseEodOrders";

const MAX_STAMPS = STAMPS_REQUIRED;
const IPOS_SOURCE = "ipos_eod";
const REWARD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** A phone_verified web account + the moment earning starts (TSK-155 gate). */
export type VerifiedAccount = {
  userId: string;
  /** `profiles.phone_verified_at` as epoch ms — orders before this never earn. */
  verifiedAt: number;
};

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
  /**
   * Resolve a phone_verified web account by phone, or null when the phone has no
   * verified web account (so it earns no stamps until the customer verifies).
   */
  findVerifiedAccountByPhone(phone: string): Promise<VerifiedAccount | null>;
  /** True if a stamp_entry already exists for this iPOS order (idempotency). */
  hasEntryForTranId(tranId: string): Promise<boolean>;
  /** The user's current `collecting` card with room left, or null. */
  findCollectingCard(userId: string): Promise<CardRow | null>;
  /** Open a fresh `collecting` card for the user. */
  createCard(userId: string): Promise<CardRow>;
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
  /** Phone had no phone_verified web account. */
  skippedNoAccount: number;
  /** Order had no usable date (can't stamp earned_at). */
  skippedUndated: number;
  /** Order was placed before the account's phone_verified_at (no retro stamps). */
  skippedPreVerification: number;
  newCards: number;
  errors: number;
};

/**
 * Deterministic ingredient for a slot — mirrors the loyalty API's add_test_stamp.
 * Every one of the {@link STAMPS_REQUIRED} slots shows a real ingredient (the
 * mascot now lives in the centre of the v2 card, not in a slot), so we just
 * cycle the pool.
 */
function ingredientForStamp(stampNumber: number): string {
  return INGREDIENT_POOL[(stampNumber - 1) % INGREDIENT_POOL.length];
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
    skippedNoAccount: 0,
    skippedUndated: 0,
    skippedPreVerification: 0,
    newCards: 0,
    errors: 0,
  };

  // Cache account lookups — heavy customers repeat the same phone many times.
  const accountCache = new Map<string, VerifiedAccount | null>();
  const accountFor = async (phone: string): Promise<VerifiedAccount | null> => {
    if (accountCache.has(phone)) return accountCache.get(phone)!;
    const acct = await store.findVerifiedAccountByPhone(phone);
    accountCache.set(phone, acct);
    return acct;
  };

  for (const order of sortOrders(orders)) {
    // 1. Idempotency: never re-stamp an order we've already imported.
    if (await store.hasEntryForTranId(order.tran_id)) {
      summary.skippedExisting++;
      continue;
    }

    // 2. Eligibility (TSK-155): phone must match a phone_verified web account.
    const account = await accountFor(order.phone);
    if (!account) {
      summary.skippedNoAccount++;
      continue;
    }

    // 3. Need a usable date to compare against the verification cutoff.
    if (order.tran_date === null) {
      summary.skippedUndated++;
      continue;
    }

    // 4. Earning STARTS at verification (TSK-155 final): orders placed before
    //    phone_verified_at NEVER earn — no retroactive stamps.
    if (order.tran_date < account.verifiedAt) {
      summary.skippedPreVerification++;
      continue;
    }

    // 5. Find the open collecting card, or roll to a fresh one.
    let card = await store.findCollectingCard(account.userId);
    if (!card || card.stamps_collected >= MAX_STAMPS) {
      card = await store.createCard(account.userId);
      summary.newCards++;
    }

    const nextStamp = card.stamps_collected + 1;
    const earnedAt = new Date(order.tran_date).toISOString();

    // 6. Insert the stamp. A duplicate tran_id here means a concurrent/re-run
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
      if (res.duplicate) summary.skippedExisting++;
      else summary.errors++;
      continue;
    }

    summary.inserted++;

    // 7. Advance the card; fill → reward_ready (next order opens a new card).
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
 * Targets the TSK-148 schema: `stamp_entries.ipos_tran_id` (unique) + `source`.
 * Stamp cards keep the base shape (`user_id` NOT NULL) — every stamp belongs to
 * a web account.
 */
export function createSupabaseStampStore(supabase: SupabaseClient): StampStore {
  return {
    async findVerifiedAccountByPhone(phone) {
      // TSK-155 gate: a phone earns stamps ONLY when it matches a profile with
      // phone_verified = true AND a non-null phone_verified_at — and only for
      // orders placed on/after that moment (the caller enforces the cutoff).
      const { data } = await supabase
        .from("profiles")
        .select("id, phone_verified_at")
        .eq("phone", phone)
        .eq("phone_verified", true)
        .not("phone_verified_at", "is", null)
        .maybeSingle();
      if (!data || !data.phone_verified_at) return null;
      const verifiedAt = Date.parse(data.phone_verified_at);
      // A profile flagged verified with an unparseable timestamp can't be given a
      // safe cutoff — skip rather than risk crediting pre-verification orders.
      if (Number.isNaN(verifiedAt)) return null;
      return { userId: data.id, verifiedAt };
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

    async findCollectingCard(userId) {
      const { data } = await supabase
        .from("stamp_cards")
        .select("id, stamps_collected, reward_status")
        .eq("user_id", userId)
        .eq("reward_status", "collecting")
        .lt("stamps_collected", MAX_STAMPS)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as CardRow | null) ?? null;
    },

    async createCard(userId) {
      const { data, error } = await supabase
        .from("stamp_cards")
        .insert({ user_id: userId })
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
