"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BowlComposition } from "@/lib/types/database";

/**
 * saveBowl + claimBowl are called PROGRAMMATICALLY (from the /api/bowls/claim
 * route and the future calculator integration), so they return result objects.
 *
 * renameBowl + deleteBowl are FORM ACTIONS, so they return Promise<void> and
 * either redirect (success) or throw (error) per Next.js's form-action contract.
 */

export async function saveBowl(input: {
  name?: string;
  composition: BowlComposition;
  kcal?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  fibre_g?: number;
  sodium_mg?: number;
  source_url?: string;
}): Promise<{ id: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("saved_bowls")
    .insert({
      user_id: user.id,
      name: input.name?.trim() || "Untitled bowl",
      composition: input.composition,
      kcal: input.kcal ?? null,
      protein_g: input.protein_g ?? null,
      fat_g: input.fat_g ?? null,
      carbs_g: input.carbs_g ?? null,
      fibre_g: input.fibre_g ?? null,
      sodium_mg: input.sodium_mg ?? null,
      source_url: input.source_url ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/account");
  return { id: data.id };
}

export async function claimBowl(
  payload: unknown
): Promise<{ id: string } | { error: string }> {
  if (!payload || typeof payload !== "object") {
    return { error: "Invalid payload" };
  }
  const p = payload as Record<string, unknown>;
  if (!p.composition || typeof p.composition !== "object") {
    return { error: "Missing composition" };
  }

  return saveBowl({
    name: typeof p.name === "string" ? p.name : undefined,
    composition: p.composition as BowlComposition,
    kcal: typeof p.kcal === "number" ? p.kcal : undefined,
    protein_g: typeof p.protein_g === "number" ? p.protein_g : undefined,
    fat_g: typeof p.fat_g === "number" ? p.fat_g : undefined,
    carbs_g: typeof p.carbs_g === "number" ? p.carbs_g : undefined,
    fibre_g: typeof p.fibre_g === "number" ? p.fibre_g : undefined,
    sodium_mg: typeof p.sodium_mg === "number" ? p.sodium_mg : undefined,
    source_url: typeof p.source_url === "string" ? p.source_url : undefined,
  });
}

/** Form action — void return, throws on error. */
export async function renameBowl(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Missing id or name");

  const supabase = createClient();
  const { error } = await supabase
    .from("saved_bowls")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/account/bowls/${id}`);
  revalidatePath("/account");
}

/** Form action — void return, throws on error, redirects on success. */
export async function deleteBowl(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const supabase = createClient();
  const { error } = await supabase
    .from("saved_bowls")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/account");
  redirect("/account");
}

/** Form action — toggles is_favourite on a saved bowl. Void return, throws on error.
 * Kept for backwards compat with progressive-enhancement <form> usage. */
export async function toggleFavourite(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  const res = await toggleFavouriteById(id);
  if ("error" in res) throw new Error(res.error);
}

/** Client-callable variant — takes id directly, returns result object instead of throwing.
 * Used by HeartToggle.client.tsx for optimistic UI on /account. */
export async function toggleFavouriteById(
  id: string
): Promise<{ ok: true; isFavourite: boolean } | { error: string }> {
  if (!id) return { error: "Missing id" };

  const supabase = createClient();
  // Atomic toggle: read current → write inverse.
  const { data: row, error: readErr } = await supabase
    .from("saved_bowls")
    .select("is_favourite")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!row) return { error: "Bowl not found" };

  const next = !row.is_favourite;
  const { error: writeErr } = await supabase
    .from("saved_bowls")
    .update({ is_favourite: next })
    .eq("id", id);
  if (writeErr) return { error: writeErr.message };

  revalidatePath("/account");
  revalidatePath("/byw");
  return { ok: true, isFavourite: next };
}
