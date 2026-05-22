"use server";

// User-facing strings declared up top so any trailing truncation hits
// the closing comment, not executable code.
const MSG_EMAIL_REQUIRED = "Vui long nhap email.";
const MSG_PASSWORD_REQUIRED = "Vui long nhap mat khau.";
const MSG_PASSWORD_TOO_SHORT = "Mat khau toi thieu 8 ky tu.";
const MSG_GOOGLE_NO_SESSION = "Khong tao duoc phien dang nhap.";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Log in an existing user with email + password. */
export async function signInWithPassword(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    redirect("/login?error=" + encodeURIComponent(MSG_EMAIL_REQUIRED));
  }
  if (!password) {
    redirect("/login?error=" + encodeURIComponent(MSG_PASSWORD_REQUIRED));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/", "layout");
  redirect("/account");
}

/** Create a new account with email + password. */
export async function signUp(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    redirect("/login?mode=signup&error=" + encodeURIComponent(MSG_EMAIL_REQUIRED));
  }
  if (!password) {
    redirect("/login?mode=signup&error=" + encodeURIComponent(MSG_PASSWORD_REQUIRED));
  }
  if (password.length < 8) {
    redirect("/login?mode=signup&error=" + encodeURIComponent(MSG_PASSWORD_TOO_SHORT));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect("/login?mode=signup&error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/", "layout");
  redirect("/account");
}

/**
 * Google OAuth — kept for future use (button is hidden in the UI for v1).
 * Still uses the /auth/callback route.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = createClient();
  const origin = headers().get("origin") ?? "https://order.tossful.vn";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: origin + "/auth/callback" },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }
  if (data?.url) {
    redirect(data.url);
  }
  redirect("/login?error=" + encodeURIComponent(MSG_GOOGLE_NO_SESSION));
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
