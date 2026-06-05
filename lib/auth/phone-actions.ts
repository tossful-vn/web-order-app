"use server";

// User-facing strings declared up top (full VN diacritics — BR-86). Body below
// stays ASCII so any trailing truncation lands in a comment, not live code.
const MSG_PHONE_REQUIRED = "Vui lòng nhập số điện thoại.";
const MSG_PHONE_INVALID = "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).";
const MSG_NAME_REQUIRED = "Vui lòng nhập tên (ít nhất 2 ký tự).";
const MSG_PHONE_TAKEN = "Số điện thoại đã được sử dụng.";
const MSG_PASSWORD_SHORT = "Mật khẩu tối thiểu 8 ký tự.";
const MSG_PASSWORD_MISMATCH = "Mật khẩu xác nhận không khớp.";
const MSG_OTP_REQUIRED = "Vui lòng nhập mã OTP.";
const MSG_OTP_INVALID = "Mã OTP không đúng.";
const MSG_OTP_EXPIRED = "Mã đã hết hạn, vui lòng yêu cầu mã mới.";
const MSG_OTP_ATTEMPTS = "Quá số lần thử, vui lòng yêu cầu OTP mới.";
const MSG_OTP_NOT_FOUND = "Không tìm thấy mã OTP, vui lòng yêu cầu lại.";
const MSG_LOGIN_FAILED = "Số điện thoại hoặc mật khẩu không đúng.";
const MSG_PHONE_NOT_REGISTERED = "Số điện thoại chưa được đăng ký.";
const MSG_GENERIC = "Có lỗi xảy ra, vui lòng thử lại.";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidVnPhone, normalizePhone, syntheticEmail } from "@/lib/auth/phone";
import { requestOtp, verifyOtp, type VerifyResult } from "@/lib/auth/otp";

/** Build a query string from defined, non-empty params. */
function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? "?" + s : "";
}

/** Only allow same-origin relative paths as a post-auth redirect target. */
function safeNext(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/account";
}

/** Map an OTP verify result to its customer-facing error (null when ok). */
function otpError(result: VerifyResult): string | null {
  switch (result) {
    case "ok":
      return null;
    case "expired":
      return MSG_OTP_EXPIRED;
    case "too_many_attempts":
      return MSG_OTP_ATTEMPTS;
    case "not_found":
      return MSG_OTP_NOT_FOUND;
    default:
      return MSG_OTP_INVALID;
  }
}

// ---------------------------------------------------------------------------
// SIGNUP — step 1: identity capture + OTP request
// ---------------------------------------------------------------------------
export async function requestSignupOtp(formData: FormData): Promise<void> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const name = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "");

  const back = (error: string) =>
    redirect("/signup" + qs({ error, phone, name, email, next }));

  if (!phone) back(MSG_PHONE_REQUIRED);
  if (!isValidVnPhone(phone)) back(MSG_PHONE_INVALID);
  if (name.length < 2) back(MSG_NAME_REQUIRED);

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (existing) back(MSG_PHONE_TAKEN);

  await requestOtp({ phone, purpose: "signup" });

  redirect("/signup" + qs({ step: "verify", phone, name, email, next }));
}

// ---------------------------------------------------------------------------
// SIGNUP — step 2: OTP verify + password -> create account + sign in
// ---------------------------------------------------------------------------
export async function verifySignupOtp(formData: FormData): Promise<void> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const name = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "");
  const otp = String(formData.get("otp") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  const back = (error: string) =>
    redirect(
      "/signup" + qs({ step: "verify", error, phone, name, email, next })
    );

  if (!otp) back(MSG_OTP_REQUIRED);
  if (password.length < 8) back(MSG_PASSWORD_SHORT);
  if (password !== confirm) back(MSG_PASSWORD_MISMATCH);

  const result = await verifyOtp({ phone, purpose: "signup", otp });
  const err = otpError(result);
  if (err) back(err);

  // OTP confirmed phone ownership. Create the auth user with a synthetic email,
  // pre-confirmed (it can never receive a confirmation mail). Service-role only.
  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: syntheticEmail(phone),
    password,
    email_confirm: true,
    user_metadata: {
      display_name: name,
      // Optional recovery email — no profiles.email column, so park it here.
      recovery_email: email || null,
    },
  });
  if (createErr || !created?.user) {
    // Most likely cause: the synthetic email already exists (phone re-used in a
    // race between step 1's uniqueness check and here).
    return back(MSG_PHONE_TAKEN);
  }

  const userId = created.user.id;

  // The on_auth_user_created trigger already inserted a profiles row with
  // defaults (preferred_store='HN'); upsert to set phone + name and force
  // preferred_store NULL so the TSK-130 lazy city prompt knows it's unset.
  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      phone,
      display_name: name,
      preferred_store: null,
      role: "customer",
      zalo_oa_subscribed: false,
    },
    { onConflict: "id" }
  );
  if (profileErr) {
    back(MSG_GENERIC);
  }

  // Establish the session via the cookie-bound server client.
  const supabase = createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(phone),
    password,
  });
  if (signInErr) {
    // Account exists now; send them to login rather than failing hard.
    redirect("/login" + qs({ error: MSG_LOGIN_FAILED, next }));
  }

  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

// ---------------------------------------------------------------------------
// LOGIN — phone + password, NO OTP
// ---------------------------------------------------------------------------
export async function signInWithPhone(formData: FormData): Promise<void> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!phone) redirect("/login" + qs({ error: MSG_PHONE_REQUIRED, next }));
  if (!password) redirect("/login" + qs({ error: MSG_LOGIN_FAILED, next }));

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(phone),
    password,
  });
  if (error) redirect("/login" + qs({ error: MSG_LOGIN_FAILED, next }));

  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

// ---------------------------------------------------------------------------
// RESET — step 1: phone -> OTP request
// ---------------------------------------------------------------------------
export async function requestResetOtp(formData: FormData): Promise<void> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (!phone) redirect("/reset-password" + qs({ error: MSG_PHONE_REQUIRED, phone }));
  if (!isValidVnPhone(phone)) {
    redirect("/reset-password" + qs({ error: MSG_PHONE_INVALID, phone }));
  }

  await requestOtp({ phone, purpose: "reset" });
  redirect("/reset-password" + qs({ step: "verify", phone }));
}

// ---------------------------------------------------------------------------
// RESET — step 2: OTP verify + new password -> update + sign in
// ---------------------------------------------------------------------------
export async function verifyResetOtp(formData: FormData): Promise<void> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const otp = String(formData.get("otp") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  const back = (error: string) =>
    redirect("/reset-password" + qs({ step: "verify", error, phone }));

  if (!otp) back(MSG_OTP_REQUIRED);
  if (password.length < 8) back(MSG_PASSWORD_SHORT);
  if (password !== confirm) back(MSG_PASSWORD_MISMATCH);

  const result = await verifyOtp({ phone, purpose: "reset", otp });
  const err = otpError(result);
  if (err) back(err);

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (!profile) back(MSG_PHONE_NOT_REGISTERED);

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    profile!.id,
    { password }
  );
  if (updateErr) back(MSG_GENERIC);

  const supabase = createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(phone),
    password,
  });
  if (signInErr) redirect("/login" + qs({ error: MSG_LOGIN_FAILED }));

  revalidatePath("/", "layout");
  redirect("/account");
}
