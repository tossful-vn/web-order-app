"use server";

// All user-facing strings declared up top so any trailing truncation
// hits the closing comment, not executable code.
const MSG_EMAIL_REQUIRED = "Vui long nhap email.";
const MSG_PASSWORD_REQUIRED = "Vui long nhap mat khau.";
const MSG_PASSWORD_TOO_SHORT = "Mat khau toi thieu 8 ky tu.";
const MSG_PASSWORDS_DONT_MATCH = "Mat khau xac nhan khong khop.";
const MSG_CURRENT_PASSWORD_WRONG = "Mat khau hien tai khong dung.";
const MSG_NOT_AUTHENTICATED = "Ban chua dang nhap.";
const MSG_GOOGLE_NO_SESSION = "Khong tao duoc phien dang nhap.";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Log in an existing user with email + password. */
export async function signInWithPassword(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email) redirect("/login?error=" + encodeURIComponent(MSG_EMAIL_REQUIRED));
  if (!password) redirect("/login?error=" + encodeURIComponent(MSG_PASSWORD_REQUIRED));

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  revalidatePath("/", "layout");
  redirect("/account");
}

/** Create a new account with email + password. */
export async function signUp(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email) redirect("/login?mode=signup&error=" + encodeURIComponent(MSG_EMAIL_REQUIRED));
  if (!password) redirect("/login?mode=signup&error=" + encodeURIComponent(MSG_PASSWORD_REQUIRED));
  if (password.length < 8) redirect("/login?mode=signup&error=" + encodeURIComponent(MSG_PASSWORD_TOO_SHORT));

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect("/login?mode=signup&error=" + encodeURIComponent(error.message));
  revalidatePath("/", "layout");
  redirect("/account");
}

/**
 * Change password while signed in. Re-authenticates with the current
 * password first to prevent session-hijack misuse.
 */
export async function changePassword(formData: FormData): Promise<void> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword) {
    redirect("/account/password?error=" + encodeURIComponent(MSG_PASSWORD_REQUIRED));
  }
  if (newPassword.length < 8) {
    redirect("/account/password?error=" + encodeURIComponent(MSG_PASSWORD_TOO_SHORT));
  }
  if (newPassword !== confirmPassword) {
    redirect("/account/password?error=" + encodeURIComponent(MSG_PASSWORDS_DONT_MATCH));
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    redirect("/login?error=" + encodeURIComponent(MSG_NOT_AUTHENTICATED));
  }

  // Re-authenticate with current password — confirms the live user owns the session.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    redirect("/account/password?error=" + encodeURIComponent(MSG_CURRENT_PASSWORD_WRONG));
  }

  // Update to new password.
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    redirect("/account/password?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/account", "layout");
  redirect("/account/password?success=1");
}

/**
 * "Forgot password" flow step 1: send a recovery email via Resend SMTP.
 * The email contains a link to /auth/callback?next=/auth/reset-password
 * which exchanges the recovery code for a short-lived session.
 */
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/login?mode=forgot&error=" + encodeURIComponent(MSG_EMAIL_REQUIRED));
  }

  const supabase = createClient();
  const origin = headers().get("origin") ?? "https://web-order-app.vercel.app";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin + "/auth/callback?next=/auth/reset-password",
  });
  if (error) {
    redirect("/login?mode=forgot&error=" + encodeURIComponent(error.message));
  }
  redirect("/login?mode=forgot&sent=1");
}

/**
 * "Forgot password" flow step 2: user clicked the recovery link, has a
 * short-lived session, now sets a new password. Sign them out after so
 * they log in fresh with the new credentials.
 */
export async function setNewPassword(formData: FormData): Promise<void> {
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!newPassword) {
    redirect("/auth/reset-password?error=" + encodeURIComponent(MSG_PASSWORD_REQUIRED));
  }
  if (newPassword.length < 8) {
    redirect("/auth/reset-password?error=" + encodeURIComponent(MSG_PASSWORD_TOO_SHORT));
  }
  if (newPassword !== confirmPassword) {
    redirect("/auth/reset-password?error=" + encodeURIComponent(MSG_PASSWORDS_DONT_MATCH));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    redirect("/auth/reset-password?error=" + encodeURIComponent(error.message));
  }

  // Sign out so the user must log in fresh with the new password.
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?reset=success");
}

/** Google OAuth — kept for future use (button hidden in UI for v1). */
export async function signInWithGoogle(): Promise<void> {
  const supabase = createClient();
  const origin = headers().get("origin") ?? "https://web-order-app.vercel.app";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: origin + "/auth/callback" },
  });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  if (data?.url) redirect(data.url);
  redirect("/login?error=" + encodeURIComponent(MSG_GOOGLE_NO_SESSION));
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// trailing ASCII buffer
