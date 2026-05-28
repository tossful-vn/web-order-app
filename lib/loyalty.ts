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
