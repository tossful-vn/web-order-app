import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INGREDIENT_POOL, STAMPS_REQUIRED } from "@/lib/types/loyalty";

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

  /* ── Tester gate (TSK-147c) ──
   * The test-stamp actions simulate orders to walk the card UX 0→9 without
   * touching customers. Restrict them to profiles.role === 'tester' so a normal
   * logged-in customer can't self-grant a free item. ensure_card / redeem_reward
   * stay open (full RLS hardening is TOS-60). Tester writes only their OWN card —
   * the existing RLS policies already allow that, so no migration is needed. */
  const TESTER_ACTIONS = ["add_test_stamp", "remove_test_stamp", "reset_test_card"];
  if (TESTER_ACTIONS.includes(action)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "tester") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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

  /* ── add_test_stamp (testing only — simulates an order earning a stamp) ── */
  if (action === "add_test_stamp") {
    const { data: card } = await supabase
      .from("stamp_cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("reward_status", "collecting")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!card) {
      return NextResponse.json({ error: "No active collecting card" }, { status: 404 });
    }

    if (card.stamps_collected >= STAMPS_REQUIRED) {
      return NextResponse.json({ error: "Card already full" }, { status: 400 });
    }

    const nextStampNum = card.stamps_collected + 1;
    const ingredient = INGREDIENT_POOL[(nextStampNum - 1) % INGREDIENT_POOL.length];

    // Insert the stamp entry
    const { error: entryErr } = await supabase.from("stamp_entries").insert({
      card_id: card.id,
      stamp_number: nextStampNum,
      ingredient_key: ingredient,
    });

    if (entryErr) {
      return NextResponse.json({ error: entryErr.message }, { status: 500 });
    }

    // Update the card
    const isComplete = nextStampNum >= STAMPS_REQUIRED;
    const updateFields: Record<string, unknown> = { stamps_collected: nextStampNum };
    if (isComplete) {
      updateFields.reward_status = "reward_ready";
      updateFields.reward_earned_at = new Date().toISOString();
      updateFields.reward_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { data: updatedCard, error: updateErr } = await supabase
      .from("stamp_cards")
      .update(updateFields)
      .eq("id", card.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Fetch all entries
    const { data: entries } = await supabase
      .from("stamp_entries")
      .select("*")
      .eq("card_id", card.id)
      .order("stamp_number", { ascending: true });

    return NextResponse.json({ card: updatedCard, entries: entries ?? [] });
  }

  /* ── remove_test_stamp (testing only — undoes one stamp, floor 0) ── */
  if (action === "remove_test_stamp") {
    const { data: card } = await supabase
      .from("stamp_cards")
      .select("*")
      .eq("user_id", user.id)
      .in("reward_status", ["collecting", "reward_ready"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!card) {
      return NextResponse.json({ error: "No active card" }, { status: 404 });
    }

    if (card.stamps_collected <= 0) {
      return NextResponse.json({ error: "Card already empty" }, { status: 400 });
    }

    // Delete the highest stamp entry, then decrement the counter (floor 0).
    const { error: delErr } = await supabase
      .from("stamp_entries")
      .delete()
      .eq("card_id", card.id)
      .eq("stamp_number", card.stamps_collected);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const nextCount = Math.max(0, card.stamps_collected - 1);
    const updateFields: Record<string, unknown> = { stamps_collected: nextCount };
    // Dropping below the requirement reverts a reward_ready card to collecting.
    if (nextCount < STAMPS_REQUIRED && card.reward_status === "reward_ready") {
      updateFields.reward_status = "collecting";
      updateFields.reward_earned_at = null;
      updateFields.reward_expires_at = null;
    }

    const { data: updatedCard, error: updateErr } = await supabase
      .from("stamp_cards")
      .update(updateFields)
      .eq("id", card.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const { data: entries } = await supabase
      .from("stamp_entries")
      .select("*")
      .eq("card_id", card.id)
      .order("stamp_number", { ascending: true });

    return NextResponse.json({ card: updatedCard, entries: entries ?? [] });
  }

  /* ── reset_test_card (testing only — back to an empty collecting card) ── */
  if (action === "reset_test_card") {
    const { data: card } = await supabase
      .from("stamp_cards")
      .select("*")
      .eq("user_id", user.id)
      .in("reward_status", ["collecting", "reward_ready"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!card) {
      return NextResponse.json({ error: "No active card" }, { status: 404 });
    }

    // Clear all entries, then zero the card back to a fresh collecting state.
    const { error: delErr } = await supabase
      .from("stamp_entries")
      .delete()
      .eq("card_id", card.id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const { data: updatedCard, error: updateErr } = await supabase
      .from("stamp_cards")
      .update({
        stamps_collected: 0,
        reward_status: "collecting",
        reward_choice: null,
        reward_earned_at: null,
        reward_expires_at: null,
        reward_redeemed_at: null,
      })
      .eq("id", card.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ card: updatedCard, entries: [] });
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
