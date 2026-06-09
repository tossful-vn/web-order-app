// NOTE: server-only — uses the service-role admin client (bypasses RLS to link
// rows across customers' historical data). Never import from the browser.
//
// Retroactive back-fill on phone verification (TSK-149, completed TSK-155).
//
// When an existing customer verifies a phone via Zalo OTP, link the historical
// iPOS rows recorded against that NORMALISED phone (the same "0XXXXXXXXX" key
// TSK-148's normalizeIposPhone produces) onto their web account AND mint the
// stamps those orders were owed.
//
// What gets linked, and how:
//
//  • byo_bowls — archived for EVERY attributable order regardless of account
//    (TSK-153). "phone-only" rows carry the phone with profile_id NULL, so a
//    verified phone links them cleanly:  SET profile_id WHERE phone=? AND
//    profile_id IS NULL.  Idempotent (a re-run links 0).
//
//  • ipos_orders — Option B (TSK-155) now persists EVERY attributable order,
//    even from unverified phones. On verify we (a) link the orphan rows
//    (SET profile_id WHERE phone=? AND profile_id IS NULL) so owner-read RLS
//    works, and (b) REPLAY them through applyStamps so the missing stamp_entries
//    are minted. Both are idempotent: linking finds nothing unlinked on re-run,
//    and applyStamps skips any tran_id that already has a stamp (UNIQUE
//    ipos_tran_id). This is the real historical stamp back-fill TSK-149 deferred.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedOrder } from "@/lib/ipos/parseEodOrders";
import { applyStamps, createSupabaseStampStore } from "@/lib/ipos/applyStamps";

export type BackfillSummary = {
  /** byo_bowls rows newly linked to the profile (phone match, was unlinked). */
  byoBowlsLinked: number;
  /** ipos_orders rows newly linked to the profile (phone match, was unlinked). */
  iposOrdersLinked: number;
  /** stamp_entries minted by replaying the customer's persisted iPOS orders. */
  stampsBackfilled: number;
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
   * Returns the number of rows linked. Idempotent (re-run links 0).
   */
  linkIposOrdersByPhone(phone: string, profileId: string): Promise<number>;
  /**
   * Replay the customer's persisted iPOS orders through the stamp pipeline so
   * the stamps they were owed are minted now the phone is verified. Returns the
   * number of stamp_entries created. Idempotent (UNIQUE ipos_tran_id).
   */
  backfillStampsFromIposOrders(phone: string, profileId: string): Promise<number>;
}

/**
 * Link every historical row attributable to `phone` onto `profileId` and mint
 * any owed stamps. Idempotent + safe to re-run; reports per-target counts.
 */
export async function backfillForVerifiedPhone(
  store: BackfillStore,
  phone: string,
  profileId: string
): Promise<BackfillSummary> {
  const byoBowlsLinked = await store.linkByoBowlsByPhone(phone, profileId);
  const iposOrdersLinked = await store.linkIposOrdersByPhone(phone, profileId);
  const stampsBackfilled = await store.backfillStampsFromIposOrders(phone, profileId);
  return { byoBowlsLinked, iposOrdersLinked, stampsBackfilled };
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
      // Same idempotency shape as bowls: only unlinked rows are touched.
      const { data, error } = await supabase
        .from("ipos_orders")
        .update({ profile_id: profileId })
        .eq("phone", phone)
        .is("profile_id", null)
        .select("id");
      if (error) throw new Error(`linkIposOrdersByPhone failed: ${error.message}`);
      return data?.length ?? 0;
    },

    async backfillStampsFromIposOrders(phone) {
      // Read every persisted order for this (now verified) phone and replay it
      // through applyStamps. applyStamps re-checks the phone_verified gate (just
      // flipped true) and skips any tran_id already stamped, so this mints only
      // the missing stamps and is safe to re-run.
      const { data, error } = await supabase
        .from("ipos_orders")
        .select("ipos_tran_id, store_id, phone, ordered_at")
        .eq("phone", phone);
      if (error) throw new Error(`backfillStampsFromIposOrders read failed: ${error.message}`);
      if (!data?.length) return 0;

      const orders: ParsedOrder[] = data.map((r) => ({
        tran_id: r.ipos_tran_id as string,
        tran_no: null,
        store_id: r.store_id as string,
        phone: r.phone as string,
        tran_date: r.ordered_at ? Date.parse(r.ordered_at as string) : null,
      }));

      const summary = await applyStamps(createSupabaseStampStore(supabase), orders);
      return summary.inserted;
    },
  };
}
