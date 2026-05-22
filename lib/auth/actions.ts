"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Form actions: return Promise<void>. On success redirect; on error redirect
 * back with an ?error query string. This matches Next.js's form action
 * contract (must return void/Promise<void>).
 */

export async function signInWithEmail(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/login?error=" + encodeURIComponent("Vui lòng nhập email."));
  }

  const supabase = createClient();
  const origin = headers().get("origin") ?? "https://order.tossful.vn";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }
  redirect("/login?sent=1");
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = createClient();
  const origin = headers().get("origin") ?? "https://order.tossful.vn";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }
  if (data?.url) {
    redirect(data.url);
  }
  redirect(
    "/login?error=" + encodeURIComponent("Không tạo được phiên đăng 