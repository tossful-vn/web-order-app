import { createClient } from "@/lib/supabase/server";
import type { StoreCity } from "@/lib/types/database";

/**
 * Resolve a user's preferred store for the app-shell city chip (TSK-145).
 * Read-only helper shared by every layout that renders AppShell, so the chip
 * can show the chosen city SSR without each layout re-implementing the query.
 * Takes the already-resolved userId to avoid a second auth.getUser() round-trip.
 * Returns null for unset / invalid values.
 */
export async function getPreferredStore(userId: string): Promise<StoreCity | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("preferred_store")
    .eq("id", userId)
    .maybeSingle();
  const ps = data?.preferred_store;
  return ps === "HN" || ps === "HCM" ? ps : null;
}
