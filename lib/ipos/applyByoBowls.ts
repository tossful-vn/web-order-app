/**
 * Archive parsed Build-Your-Own bowls into Postgres (TSK-153, Part A).
 *
 * Unlike Magic Stamps (web-account holders only), the BYO archive keeps EVERY
 * bowl it can attribute to a line id — even ones with no web account — so the
 * recs layer has aggregate trends as well as per-customer history:
 *   - phone matches a phone_verified `profiles` row → link `profile_id` (TSK-155),
 *   - phone present but no verified account → keep the phone, `profile_id` null,
 *   - no attributable phone                 → archive anyway, phone + profile null.
 * Bowls with no usable order date are skipped (the column is NOT NULL and an
 * undated archive row is useless for trends).
 *
 * Idempotent on the iPOS `ipos_line_id` (UNIQUE): re-importing the same file
 * inserts nothing new. A bowl and its ingredients are written together; a
 * duplicate line id is reported, not thrown.
 *
 * The core (`applyByoBowls`) talks to a tiny `ByoStore` port so it can be unit
 * tested against an in-memory fake; `createSupabaseByoStore` is the live
 * adapter used by the import script.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ByoBowl } from "@/lib/ipos/parseByoBowls";

/** Row written to `byo_bowls`. */
export type NewBowl = {
  ipos_tran_id: string;
  ipos_line_id: string;
  profile_id: string | null;
  phone: string | null;
  store_id: string;
  ordered_at: string;
  ingredient_count: number;
};

/** Row written to `byo_bowl_ingredients`. */
export type NewIngredient = {
  bowl_id: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  is_modifier: boolean;
};

export type InsertBowlResult =
  | { ok: true; bowlId: string }
  | { ok: false; duplicate: boolean };

/** The narrow set of DB operations `applyByoBowls` needs. */
export interface ByoStore {
  /** Resolve a `profiles.id` by phone, or null when the phone has no account. */
  findProfileIdByPhone(phone: string): Promise<string | null>;
  /** True when this iPOS line was already archived (idempotency). */
  hasBowlForLineId(lineId: string): Promise<boolean>;
  /** Insert one bowl; reports a duplicate line id rather than throwing. */
  insertBowl(bowl: NewBowl): Promise<InsertBowlResult>;
  /** Insert a bowl's ingredient lines. */
  insertIngredients(ingredients: NewIngredient[]): Promise<void>;
}

export type ApplyByoSummary = {
  bowls: number;
  inserted: number;
  /** Already archived (idempotency hit). */
  skippedExisting: number;
  /** Skipped because the bowl had no usable order date. */
  skippedUndated: number;
  /** Bowls linked to a web account (phone matched a profile). */
  linkedToProfile: number;
  /** Bowls archived with a phone but no matching account. */
  phoneOnly: number;
  /** Bowls archived with no attributable phone. */
  anonymous: number;
  ingredients: number;
  errors: number;
};

/** Real (non-modifier) ingredients — the meaningful "bowl size" for recs. */
function realIngredientCount(bowl: ByoBowl): number {
  return bowl.ingredients.reduce((n, ing) => n + (ing.is_modifier ? 0 : 1), 0);
}

/**
 * Archive the given BYO bowls. Safe to re-run: bowls whose `ipos_line_id` was
 * already archived are skipped, not duplicated.
 */
export async function applyByoBowls(
  store: ByoStore,
  bowls: ByoBowl[],
): Promise<ApplyByoSummary> {
  const summary: ApplyByoSummary = {
    bowls: bowls.length,
    inserted: 0,
    skippedExisting: 0,
    skippedUndated: 0,
    linkedToProfile: 0,
    phoneOnly: 0,
    anonymous: 0,
    ingredients: 0,
    errors: 0,
  };

  // Cache phone → profile lookups; one customer can have many BYO bowls.
  const profileCache = new Map<string, string | null>();
  const profileFor = async (phone: string): Promise<string | null> => {
    if (profileCache.has(phone)) return profileCache.get(phone)!;
    const id = await store.findProfileIdByPhone(phone);
    profileCache.set(phone, id);
    return id;
  };

  for (const bowl of bowls) {
    // 1. Undated bowls can't be archived (ordered_at is NOT NULL + useless).
    if (!bowl.ordered_at) {
      summary.skippedUndated++;
      continue;
    }

    // 2. Idempotency: never re-archive a line we've already stored.
    if (await store.hasBowlForLineId(bowl.ipos_line_id)) {
      summary.skippedExisting++;
      continue;
    }

    // 3. Link to a web account when the phone matches; otherwise keep the phone.
    const profileId = bowl.phone ? await profileFor(bowl.phone) : null;

    // 4. Insert the bowl (idempotent on ipos_line_id).
    const res = await store.insertBowl({
      ipos_tran_id: bowl.ipos_tran_id,
      ipos_line_id: bowl.ipos_line_id,
      profile_id: profileId,
      phone: bowl.phone,
      store_id: bowl.store_id,
      ordered_at: bowl.ordered_at,
      ingredient_count: realIngredientCount(bowl),
    });

    if (!res.ok) {
      if (res.duplicate) summary.skippedExisting++;
      else summary.errors++;
      continue;
    }

    // 5. Insert the bowl's ingredients (modifiers flagged, quantities preserved).
    if (bowl.ingredients.length > 0) {
      await store.insertIngredients(
        bowl.ingredients.map((ing) => ({
          bowl_id: res.bowlId,
          item_id: ing.item_id,
          item_name: ing.item_name,
          quantity: ing.quantity,
          is_modifier: ing.is_modifier,
        })),
      );
      summary.ingredients += bowl.ingredients.length;
    }

    summary.inserted++;
    if (profileId) summary.linkedToProfile++;
    else if (bowl.phone) summary.phoneOnly++;
    else summary.anonymous++;
  }

  return summary;
}

/* ───────────────────────── Supabase adapter ───────────────────────── */

/** Postgres unique-violation. */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Live `ByoStore` backed by a (service-role) Supabase client.
 *
 * Targets the TSK-153 schema: `byo_bowls.ipos_line_id` (unique) +
 * `byo_bowl_ingredients` (cascade on bowl delete).
 */
export function createSupabaseByoStore(supabase: SupabaseClient): ByoStore {
  return {
    async findProfileIdByPhone(phone) {
      // TSK-155 gate: link a bowl to an account ONLY when the phone matches a
      // profile with phone_verified = true. Unverified/unmatched bowls are still
      // archived phone-only (profile_id NULL) and linked later on verify.
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .eq("phone_verified", true)
        .maybeSingle();
      return data?.id ?? null;
    },

    async hasBowlForLineId(lineId) {
      const { data } = await supabase
        .from("byo_bowls")
        .select("id")
        .eq("ipos_line_id", lineId)
        .limit(1)
        .maybeSingle();
      return !!data;
    },

    async insertBowl(bowl) {
      const { data, error } = await supabase
        .from("byo_bowls")
        .insert(bowl)
        .select("id")
        .single();
      if (!error && data) return { ok: true, bowlId: data.id as string };
      return { ok: false, duplicate: error?.code === PG_UNIQUE_VIOLATION };
    },

    async insertIngredients(ingredients) {
      if (ingredients.length === 0) return;
      const { error } = await supabase.from("byo_bowl_ingredients").insert(ingredients);
      if (error) throw new Error(`insertIngredients failed: ${error.message}`);
    },
  };
}
