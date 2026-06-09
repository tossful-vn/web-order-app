// NOTE: server-only — uses the service-role admin client (bypasses RLS to link
// rows across customers' historical data). Never import from the browser.
//
// Retroactive back-fill on phone verification (TSK-149).
//
// When an existing customer verifies a phone via Zalo OTP, link the historical
// iPOS rows recorded against that NORMALISED phone (the same "0XXXXXXXXX" key
// TSK-148's normalizeIposPhone produces) onto their web account.
//
// What CAN be linked by phone, and what cannot:
//
//  • byo_bowls — archived for EVERY attributable order regardless of account
//    (TSK-153). "phone-only" rows carry the phone with profile_id NULL, so a
//    verified phone links them cleanly:  SET profile_id WHERE phone=? AND
//    profile_id IS NULL.  Idempotent (a re-run links 0). This is the real,
//    lossless back-fill.
//
//  • Magic Stamps (stamp_cards / stamp_entries) — there is NO phone-keyed
//    orphan row to link. stamp_cards.user_id is NOT NULL and applyStamps SKIPS
//    any iPOS order whose phone has no verified web account at import time
//    (summary.skippedNoAccount); those orders are not persisted anywhere
//    (no transactions table). So historical stamps cannot be reconstructed from
//    stored data — linkStampsByPhone returns 0. Going forward, now that the
//    phone is verified + on the profile, the NEXT iPOS EOD import attributes the
//    customer's orders normally. A full historical stamp back-fill needs the
//    iPOS Hub re-pull (TSK-151) — out of scope here. The seam below is kept so
//    TSK-151 can drop in the real implementation without touching callers.

import type { SupabaseClient } from "@supabase/supabase-js";

export type BackfillSummary = {
  /** byo_bowls rows newly linked to the profile (phone match, was unlinked). */
  byoBowlsLinked: number;
  /** Always 0 in the current schema — see module note (TSK-151 seam). */
  stampsLinked: number;
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
   * Stamps have no phone-keyed orphan rows (see module note). Returns 0 until
   * TSK-151 persists historical orders to replay.
   */
  linkStampsByPhone(phone: string, profileId: string): Promise<number>;
}

/**
 * Link every historical row attributable to `phone` onto `profileId`.
 * Idempotent + safe to re-run; reports per-target counts.
 */
export async function backfillForVerifiedPhone(
  store: BackfillStore,
  phone: string,
  profileId: string
): Promise<BackfillSummary> {
  const byoBowlsLinked = await store.linkByoBowlsByPhone(phone, profileId);
  const stampsLinked = await store.linkStampsByPhone(phone, profileId);
  return { byoBowlsLinked, stampsLinked };
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

    async linkStampsByPhone() {
      // No phone-keyed stamp rows exist to link (see module note). Future iPOS
      // imports attribute this customer now the phone is verified on-profile.
      return 0;
    },
  };
}
