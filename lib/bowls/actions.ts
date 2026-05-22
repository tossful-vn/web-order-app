"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BowlComposition } from "@/lib/types/database";

/**
 * Save a brand-new bowl for the current user.
 * Called from:
 *   - The (future) "Save this bowl" CTA inside /nutrition (Step 5)
 *   - The guest-claim flow after login (claimBowl below)
 *
 * Returns { id } on success, { error } otherwise.
 * RLS handles ownership — we just need the authed Supabase client.
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
}) {
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

/**
 * Claim a guest-built bowl that's been held in localStorage during the
 * magic-link round-trip. Called from a client component on /account mount.
 */
export async function claimBowl(payload: unknown) {
  // Validate the payload shape — we accept it as `unknown` because it
  // came from localStorage and can't be trusted.
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

/** Rename an existing bowl. */
export async function renameBowl(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Missing id or name" };

  const supabase = createClient();
  const { error } = await supabase
    .from("saved_bowls")
    .update({ name })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/account/bowls/${id}`);
  revalidatePath("/account");
  return { ok: true };
}

/** Delete a bowl. Redirects back to /account on success. */
export async function deleteBowl(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id" };

  const supabase = createClient();
  const { error } = await supabase
    .from("saved_bowls")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/account");
  redirect("/account");
}
