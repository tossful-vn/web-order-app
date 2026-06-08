"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StoreCity } from "@/lib/types/database";

/**
 * Form action — void return, throws on error. The profiles row is auto-created
 * by the on_auth_user_created trigger on signup, so we only ever UPDATE.
 *
 * Note: preferred_store is intentionally NOT handled here. It has its own
 * dedicated toggle (TSK-130) backed by setPreferredStore/clearPreferredStore,
 * so saving name/phone never clobbers the customer's chosen city.
 */
export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const contact_phone = String(formData.get("contact_phone") ?? "").trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, contact_phone })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/account/profile");
  revalidatePath("/account");
}

/**
 * Set the customer's preferred store (TSK-130). Called from the lazy city
 * prompt on /nutrition and from the /account/profile toggle. Revalidates
 * /nutrition so prices render with the chosen city on the next render.
 */
export async function setPreferredStore(city: StoreCity): Promise<void> {
  if (city !== "HN" && city !== "HCM") throw new Error("Invalid store");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_store: city })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/nutrition");
  revalidatePath("/account/profile");
}

/**
 * Clear the customer's preferred store back to NULL (TSK-130). Hides prices
 * again and re-arms the lazy prompt on the next /nutrition visit.
 */
export async function clearPreferredStore(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_store: null })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/nutrition");
  revalidatePath("/account/profile");
}

/**
 * Toggle the customer's marketing-email consent (TSK-143). Called from the
 * /account/profile toggle. There is deliberately NO setConsentTransactional:
 * transactional consent is a server-side rule (always TRUE) — turning it off
 * would mean we can't send order confirmations, so it's not user-toggleable.
 */
export async function setConsentMarketing(enabled: boolean): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({
      consent_marketing: enabled,
      consent_updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/account/profile");
}
