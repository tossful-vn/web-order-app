"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Send a magic link to the supplied email. Supabase emails the link;
 * clicking it lands on /auth/callback which exchanges the code for a session.
 */
export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Vui lòng nhập email." };

  const supabase = createClient();
  const origin = headers().get("origin") ?? "https://order.tossful.vn";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Begin a Google OAuth flow. Supabase redirects to Google, then back to
 * /auth/callback with a code to exchange.
 */
export async function signInWithGoogle() {
  const supabase = createClient();
  const origin = headers().get("origin") ?? "https://order.tossful.vn";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error) return { error: error.message };
  if (data?.url) redirect(data.url);
  return { ok: true };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
