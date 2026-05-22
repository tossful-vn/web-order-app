"use server";

// User-facing strings declared up top so any trailing truncation hits
// the closing comment, not executable code.
const MSG_EMAIL_REQUIRED = "Vui long nhap email.";
const MSG_GOOGLE_NO_SESSION = "Khong tao duoc phien dang nhap.";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signInWithEmail(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/login?error=" + encodeURIComponent(MSG_EMAIL_REQUIRED));
  }

  const supabase = createClient();
  const origin = headers().get("origin") ?? "https://order.tossful.vn";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: origin + "/auth/callback" },
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
