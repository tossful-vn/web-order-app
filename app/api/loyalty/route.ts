import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action as string;

  /* ── ensure_card ── */
  if (action === "ensure_card") {
    // Look for an active card (collecting or reward_ready)
    const { data: existing } = await supabase
      .from("stamp_cards")
      .select("*")
      .eq("user_id", user.id)
      .in("reward_status", ["collecting", "reward_ready"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Fetch entries
      const { data: entries } = await supabase
        .from("stamp_entries")
        .select("*")
        .eq("card_id", existing.id)
        .order("stamp_number", { ascending: true });

      return NextResponse.json({ card: existing, entries: entries ?? [] });
    }

    // Create new card
    const { data: newCard, error: insertErr } = await supabase
      .from("stamp_cards")
      .insert({ user_id: user.id })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ card: newCard, entries: [] });
  }

  /* ── redeem_reward ── */
  if (action === "redeem_reward") {
    const choice = body.choice as string;
    if (!["bowl", "protein", "topping", "drink"].includes(choice)) {
      return NextResponse.json({ error: "Invalid reward choice" }, { status: 400 });
    }

    // Find the reward_ready card
    const { data: readyCard } = await supabase
      .from("stamp_cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("reward_status", "reward_ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!readyCard) {
      return NextResponse.json({ error: "No reward-ready card found" }, { status: 404 });
    }

    // Mark as redeemed
    const { data: redeemedCard, error: updateErr } = await supabase
      .from("stamp_cards")
      .update({
        reward_choice: choice,
        reward_redeemed_at: new Date().toISOString(),
        reward_status: "redeemed",
      })
      .eq("id", readyCard.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Create a new card for the next cycle
    const { data: newCard, error: newErr } = await supabase
      .from("stamp_cards")
      .insert({ user_id: user.id })
      .select()
      .single();

    if (newErr) {
      return NextResponse.json({ error: newErr.message }, { status: 500 });
    }

    return NextResponse.json({
      old_card: redeemedCard,
      new_card: newCard,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
