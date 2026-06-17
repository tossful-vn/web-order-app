import { createClient } from "@/lib/supabase/server";
import type { StampCard, StampEntry } from "@/lib/types/loyalty";

/**
 * Fetch the active stamp card + entries for the current user.
 * Returns null if no user is authenticated or no active card exists.
 */
export async function getActiveStampCard(): Promise<{
  card: StampCard;
  entries: StampEntry[];
} | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Find active card (collecting or reward_ready), most recent first
  const { data: card, error } = await supabase
    .from("stamp_cards")
    .select("*")
    .eq("user_id", user.id)
    .in("reward_status", ["collecting", "reward_ready"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !card) return null;

  // Fetch stamp entries for this card
  const { data: entries } = await supabase
    .from("stamp_entries")
    .select("*")
    .eq("card_id", card.id)
    .order("stamp_number", { ascending: true });

  return {
    card: card as StampCard,
    entries: (entries ?? []) as StampEntry[],
  };
}

/**
 * The full data the v2 stamp card needs to render server-side (TSK-153, Part B).
 * Counts are always read from the DB — never hardcoded. `hasVerifiedPhone`
 * tells the card whether stamps can ever attach to this account: a profile gets
 * its `phone` set ONLY via the OTP-verified signup/reset flow, so a null phone
 * means "no number on file" → the card shows the "add your phone" state instead
 * of an empty progress ring.
 */
export async function getStampCardView(): Promise<{
  card: StampCard | null;
  entries: StampEntry[];
  hasVerifiedPhone: boolean;
  /** Tester accounts (profiles.role === 'tester') get the +1/-1/Reset dev control. */
  isTester: boolean;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { card: null, entries: [], hasVerifiedPhone: false, isTester: false };

  const [{ data: profile }, active] = await Promise.all([
    supabase.from("profiles").select("phone, role").eq("id", user.id).maybeSingle(),
    getActiveStampCard(),
  ]);

  return {
    card: active?.card ?? null,
    entries: active?.entries ?? [],
    hasVerifiedPhone: !!profile?.phone,
    isTester: profile?.role === "tester",
  };
}
