// NOTE: server-only — uses the service-role admin client (bypasses RLS to link
// rows across customers' historical data). Never import from the browser.
//
// Retroactive linking on phone verification (TSK-149, gate finalised TSK-155).
//
// When an existing customer verifies a phone via Zalo OTP, link the historical
// iPOS rows recorded against that NORMALISED phone (the same "0XXXXXXXXX" key
// TSK-148's normalizeIposPhone produces) onto their web account.
//
// IMPORTANT (Hieu's final rule, TSK-155): Magic Stamp accrual STARTS at
// verification — orders placed BEFORE phone_verified_at NEVER earn a stamp.
// So verification mints NO retroactive stamps. What it DOES do:
//
//  • byo_bowls — BYO is preference/taste data, not a reward, so we still link
//    ALL of it. "phone-only" rows carry the phone with profile_id NULL; a
//    verified phone links them cleanly: SET profile_id WHERE phone=? AND
//    profile_id IS NULL.  Idempotent (a re-run links 0).
//
//  • ipos_orders — Option B (TSK-155) persists EVERY attributable order. We link
//    the orphan rows (SET profile_id WHERE phone=? AND profile_id IS NULL) so the
//    customer can see their order history under owner-read RLS. We do NOT replay
//    them into stamps: pre-verification orders are never stamped, and future
//    orders earn at import time via applyStamps' ordered_at >= phone_verified_at
//    gate.

import type { SupabaseClient } from "@supabase/supabase-js";

export type BackfillSummary = {
  /** byo_bowls rows newly linked to the profile (phone match, was unlinked). */
  byoBowlsLinked: number;
  /** ipos_orders rows newly linked to the profile (phone match, was unlinked). */
  iposOrdersLinked: number;
  /** ipos_order_items rows newly linked to the profile (phone match, unlinked). */
  orderItemsLinked: number;
};

/** The narrow set of DB operations the back-fill needs. */
export interface BackfillStore {
  /**
   * Link archived BYO bowls whose phone matches and that aren't yet linked to
   * any profile. Returns the number of rows linked. Idempotent: a second run
   * finds none unlinked and returns 0.
   */
  linkByoBowlsByPhone(phone: string, profileId: string): Promise<number>;
  /**
   * Link persisted iPOS orders whose phone matches and that aren't yet linked.
   * Returns the number of rows linked. Idempotent (re-run links 0). Does NOT
   * mint stamps — pre-verification orders never earn (TSK-155).
   */
  linkIposOrdersByPhone(phone: string, profileId: string): Promise<number>;
  /**
   * Link captured iPOS order items whose phone matches and that aren't yet
   * linked. Returns the number of rows linked. Idempotent (re-run links 0).
   * Pure taste/history data (TSK-172) — like BYO, ALL of it links on verify.
   */
  linkOrderItemsByPhone(phone: string, profileId: string): Promise<number>;
}

/**
 * Link every historical row attributable to `phone` onto `profileId`. Mints no
 * stamps (earning starts at verification, TSK-155). Idempotent + safe to re-run;
 * reports per-target link counts.
 */
export async function backfillForVerifiedPhone(
  store: BackfillStore,
  phone: string,
  profileId: string
): Promise<BackfillSummary> {
  const byoBowlsLinked = await store.linkByoBowlsByPhone(phone, profileId);
  const iposOrdersLinked = await store.linkIposOrdersByPhone(phone, profileId);
  const orderItemsLinked = await store.linkOrderItemsByPhone(phone, profileId);
  return { byoBowlsLinked, iposOrdersLinked, orderItemsLinked };
}

/* ───────────────────────── Supabase adapter ───────────────────────── */

/** Live BackfillStore backed by a (service-role) Supabase client. */
export function createSupabaseBackfillStore(
  supabase: SupabaseClient
): BackfillStore {
  return {
    async linkByoBowlsByPhone(phone, profileId) {
      // `.is("profile_id", null)` is what makes this idempotent: a re-run finds
      // the rows already linked and updates nothing.
      const { data, error } = await supabase
        .from("byo_bowls")
        .update({ profile_id: profileId })
        .eq("phone", phone)
        .is("profile_id", null)
        .select("id");
      if (error) throw new Error(`linkByoBowlsByPhone failed: ${error.message}`);
      return data?.length ?? 0;
    },

    async linkIposOrdersByPhone(phone, profileId) {
      // Same idempotency shape as bowls: only unlinked rows are touched. No
      // stamps are minted here — earning starts at phone_verified_at (TSK-155).
      const { data, error } = await supabase
        .from("ipos_orders")
        .update({ profile_id: profileId })
        .eq("phone", phone)
        .is("profile_id", null)
        .select("id");
      if (error) throw new Error(`linkIposOrdersByPhone failed: ${error.message}`);
      return data?.length ?? 0;
    },

    async linkOrderItemsByPhone(phone, profileId) {
      // Same idempotency shape: only unlinked rows are touched. Pure taste data
      // (TSK-172) — all of it links on verify, like BYO bowls.
      const { data, error } = await supabase
        .from("ipos_order_items")
        .update({ profile_id: profileId })
        .eq("phone", phone)
        .is("profile_id", null)
        .select("id");
      if (error) throw new Error(`linkOrderItemsByPhone failed: ${error.message}`);
      return data?.length ?? 0;
    },
  };
}
