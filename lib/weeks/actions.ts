"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { WeekItemKind } from "@/lib/types/database";

/**
 * Server actions for the /byw multi-item planner.
 * Form-bound actions return Promise<void> (throw on error, revalidate on success).
 * Programmatic actions return result objects.
 */

/** Get-or-create the user's current draft week. Returns week id. */
async function getOrCreateDraftWeek(): Promise<{ id: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Find existing draft
  const { data: existing, error: findErr } = await supabase
    .from("weeks")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .limit(1)
    .maybeSingle();
  if (findErr) return { error: findErr.message };
  if (existing) return { id: existing.id };

  // Create one
  const { data: created, error: createErr } = await supabase
    .from("weeks")
    .insert({
      user_id: user.id,
      label: "Tuần của tôi",
      status: "draft",
    })
    .select("id")
    .single();
  if (createErr) return { error: createErr.message };
  return { id: created.id };
}

export async function ensureDraftWeek(): Promise<{ id: string } | { error: string }> {
  return getOrCreateDraftWeek();
}

/**
 * Add an item to a day. The shape depends on item_kind:
 *   - bowl:   pass bowlId
 *   - drink/food: pass addonId
 *   - custom: pass customName + optional custom_*
 */
export async function addWeekItem(input: {
  dayIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  itemKind: WeekItemKind;
  bowlId?: string;
  addonId?: string;
  customName?: string;
  customKcal?: number;
  customProteinG?: number;
  customFatG?: number;
  customCarbsG?: number;
  customFibreG?: number;
}): Promise<{ id: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const weekRes = await getOrCreateDraftWeek();
  if ("error" in weekRes) return weekRes;

  // Compute next sort_order for this day
  const { data: existing, error: cntErr } = await supabase
    .from("week_items")
    .select("sort_order")
    .eq("week_id", weekRes.id)
    .eq("day_index", input.dayIndex)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (cntErr) return { error: cntErr.message };
  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1;

  const row: Record<string, unknown> = {
    week_id: weekRes.id,
    user_id: user.id,
    day_index: input.dayIndex,
    item_kind: input.itemKind,
    sort_order: nextSort,
  };

  if (input.itemKind === "bowl") {
    if (!input.bowlId) return { error: "bowlId required for bowl" };
    row.bowl_id = input.bowlId;
  } else if (input.itemKind === "drink" || input.itemKind === "food" || input.itemKind === "wrap" || input.itemKind === "side") {
    if (!input.addonId) return { error: "addonId required for addon item" };
    row.addon_id = input.addonId;
  } else if (input.itemKind === "custom") {
    if (!input.customName) return { error: "customName required for custom" };
    row.custom_name = input.customName;
    if (input.customKcal != null) row.custom_kcal = input.customKcal;
    if (input.customProteinG != null) row.custom_protein_g = input.customProteinG;
    if (input.customFatG != null) row.custom_fat_g = input.customFatG;
    if (input.customCarbsG != null) row.custom_carbs_g = input.customCarbsG;
    if (input.customFibreG != null) row.custom_fibre_g = input.customFibreG;
  }

  const { data, error } = await supabase
    .from("week_items")
    .insert(row)
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/byw");
  return { id: data.id };
}

/** Form-bound: remove a single week_item by id. */
export async function removeWeekItem(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const supabase = createClient();
  const { error } = await supabase.from("week_items").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/byw");
}

/** Form-bound: clear all items for a given day. */
export async function clearWeekDay(formData: FormData): Promise<void> {
  const weekId = String(formData.get("week_id") ?? "");
  const dayIndex = Number(formData.get("day_index") ?? -1);
  if (!weekId || dayIndex < 0 || dayIndex > 6) throw new Error("Bad args");

  const supabase = createClient();
  const { error } = await supabase
    .from("week_items")
    .delete()
    .eq("week_id", weekId)
    .eq("day_index", dayIndex);
  if (error) throw new Error(error.message);

  revalidatePath("/byw");
}
