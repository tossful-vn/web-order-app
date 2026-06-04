"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BywPlan,
  BywSlots,
  DeliveryPrefs,
  OrderPending,
} from "@/lib/types/database";

/**
 * Phase 1.5 Sprint 1 (TSK-117) data wrappers for "Plan my Week" + the Path-1
 * order queue. All calls go through the cookie-authenticated server Supabase
 * client and rely on RLS for ownership / staff gating (see migrations
 * 20260604_phase15_byw_plans + 20260604_phase15_orders_pending).
 *
 * These return the row directly and THROW on error (programmatic contract,
 * like saveBowl/claimBowl). Row + jsonb shapes are defined in
 * lib/types/database.ts because a "use server" module may only export async
 * functions — import those types from there, not from here.
 */

// ── Plans ───────────────────────────────────────────────────────────────────

/** Load the caller's plan for a given Monday, or null if none exists. */
export async function loadPlan(weekStartDate: string): Promise<BywPlan | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("byw_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BywPlan | null) ?? null;
}

/**
 * Create or replace the caller's plan for a week. Upserts on the
 * (user_id, week_start_date) unique constraint, so calling twice for the same
 * week overwrites the slots rather than erroring.
 */
export async function upsertPlan(
  weekStartDate: string,
  slots: BywSlots
): Promise<BywPlan> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("byw_plans")
    .upsert(
      { user_id: user.id, week_start_date: weekStartDate, slots },
      { onConflict: "user_id,week_start_date" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/byw");
  return data as BywPlan;
}

/** List the caller's plans, most recent week first. */
export async function listMyPlans(limit = 12): Promise<BywPlan[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("byw_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as BywPlan[]) ?? [];
}

// ── Orders ──────────────────────────────────────────────────────────────────

/**
 * Submit an order for one of the caller's plans. Inserts an orders_pending row
 * in status 'pending' for staff to confirm (TSK-128). user_id is set from the
 * session so the owner RLS insert policy is satisfied.
 */
export async function submitOrderForPlan(
  planId: string,
  prefs: DeliveryPrefs
): Promise<OrderPending> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("orders_pending")
    .insert({
      plan_id: planId,
      user_id: user.id,
      delivery_prefs: prefs,
      // status defaults to 'pending' at the DB level
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/byw");
  return data as OrderPending;
}

/** List the caller's own orders, most recent first. */
export async function listMyOrders(limit = 20): Promise<OrderPending[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("orders_pending")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as OrderPending[]) ?? [];
}

// ── Staff-only wrappers (gated by the staff RLS policies) ────────────────────

/**
 * List all orders still awaiting staff action. Returns rows only when the
 * caller's profiles.role is 'staff' or 'admin' (orders_pending_staff_select_all);
 * a customer caller sees an empty list because the staff SELECT policy yields
 * no rows and the owner policy only matches their own.
 */
export async function listPendingOrdersForStaff(): Promise<OrderPending[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders_pending")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as OrderPending[]) ?? [];
}

/**
 * Staff confirm an order: status -> 'confirmed', stamping who/when. Requires a
 * staff/admin session (orders_pending_staff_update RLS).
 */
export async function confirmOrderAsStaff(orderId: string): Promise<OrderPending> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("orders_pending")
    .update({
      status: "confirmed",
      staff_confirmed_by: user.id,
      staff_confirmed_at: new Date().toISOString(),
      reject_reason: null,
    })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/staff/orders-board");
  return data as OrderPending;
}

/**
 * Staff reject an order: status -> 'rejected' with a reason. staff_confirmed_*
 * records the actor (no separate rejected_by column). Requires staff/admin.
 */
export async function rejectOrderAsStaff(
  orderId: string,
  reason: string
): Promise<OrderPending> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("orders_pending")
    .update({
      status: "rejected",
      reject_reason: reason,
      staff_confirmed_by: user.id,
      staff_confirmed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/staff/orders-board");
  return data as OrderPending;
}
