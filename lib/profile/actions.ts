"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Form action — void return, throws on error. The profiles row is auto-created
 * by the on_auth_user_created trigger on signup, so we only ever UPDATE.
 */
export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const contact_phone = String(formData.get("contact_phone") ?? "").trim() || null;
  const preferred_store_raw = String(formData.get("preferred_store") ?? "HN");
  const preferred_store: "HN" | "HCM" =
    preferred_store_raw === "HCM" ? "HCM" : "HN";

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, contact_phone, preferred_store })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/account/profile");
  revalidatePath("/account");
}
