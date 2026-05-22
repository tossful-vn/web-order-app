"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Update the current user's profile row.
 * The row is auto-created on signup by the on_auth_user_created trigger,
 * so we only ever UPDATE, never INSERT.
 */
export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const contact_phone = String(formData.get("contact_phone") ?? "").trim() || null;
  const preferred_store_raw = String(formData.get("preferred_store") ?? "HN");
  const preferred_store: "HN" | "SG" =
    preferred_store_raw === "SG" ? "SG" : "HN";

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, contact_phone, preferred_store })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { ok: true };
}
