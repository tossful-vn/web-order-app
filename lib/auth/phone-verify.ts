"use server";

// User-facing strings up top (full VN diacritics — BR-86). Body below stays
// ASCII so any trailing truncation lands in a comment, not live code.
const MSG_AUTH = "Vui lòng đăng nhập để xác minh số điện thoại.";
const MSG_PHONE_REQUIRED = "Vui lòng nhập số điện thoại.";
const MSG_PHONE_INVALID = "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).";
const MSG_PHONE_TAKEN = "Số điện thoại đã được liên kết với tài khoản khác.";
const MSG_OTP_REQUIRED = "Vui lòng nhập mã OTP.";
const MSG_OTP_INVALID = "Mã OTP không đúng.";
const MSG_OTP_EXPIRED = "Mã đã hết hạn, vui lòng yêu cầu mã mới.";
const MSG_OTP_ATTEMPTS = "Quá số lần thử, vui lòng yêu cầu OTP mới.";
const MSG_OTP_NOT_FOUND = "Không tìm thấy mã OTP, vui lòng yêu cầu lại.";
const MSG_SEND_FAILED = "Không gửi được mã qua Zalo, vui lòng thử lại.";
const MSG_GENERIC = "Có lỗi xảy ra, vui lòng thử lại.";
const MSG_RATE_PREFIX = "Vui lòng đợi";
const MSG_RATE_SUFFIX = "giây rồi thử lại.";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidVnPhone, maskPhone, normalizePhone } from "@/lib/auth/phone";
import { requestOtp, verifyOtp, type VerifyResult } from "@/lib/auth/otp";
import {
  backfillForVerifiedPhone,
  createSupabaseBackfillStore,
} from "@/lib/loyalty/backfill";

export type RequestVerifyResult =
  | { ok: true; mocked: boolean }
  | { ok: false; error: string };

export type VerifyPhoneResult =
  | {
      ok: true;
      maskedPhone: string;
      byoBowlsLinked: number;
      /** iPOS orders linked to the account (TSK-155 Option B persistence). */
      iposOrdersLinked: number;
      /** iPOS order items linked to the account (TSK-172 taste/history capture). */
      orderItemsLinked: number;
    }
  | { ok: false; error: string };

function otpErrorMsg(result: VerifyResult): string {
  switch (result) {
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

/** Resolve the signed-in user id from the cookie-bound server client. */
async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Step 1 — send a Zalo OTP to the phone the customer wants to verify.
 * Login-only. Rejects a phone already owned by ANOTHER account (phone is UNIQUE
 * in profiles). Returns a plain result the client section renders inline.
 */
export async function requestVerifyOtpAction(
  phoneRaw: string
): Promise<RequestVerifyResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: MSG_AUTH };

  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false, error: MSG_PHONE_REQUIRED };
  if (!isValidVnPhone(phone)) return { ok: false, error: MSG_PHONE_INVALID };

  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (owner && owner.id !== userId) return { ok: false, error: MSG_PHONE_TAKEN };

  const res = await requestOtp({ phone, purpose: "verify" });
  if (!res.ok) {
    if (res.reason === "rate_limited") {
      return {
        ok: false,
        error: `${MSG_RATE_PREFIX} ${res.retryAfterSec} ${MSG_RATE_SUFFIX}`,
      };
    }
    return { ok: false, error: MSG_SEND_FAILED };
  }
  return { ok: true, mocked: res.mocked };
}

/**
 * Step 2 — verify the submitted code, mark the phone verified on the profile,
 * and link historical iPOS rows (BYO bowls + orders) recorded against that
 * normalised phone. Mints NO stamps — earning starts at verification (TSK-155).
 * Reports per-target link counts so the UI can show what history was linked.
 */
export async function verifyPhoneOtpAction(
  phoneRaw: string,
  otpRaw: string
): Promise<VerifyPhoneResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: MSG_AUTH };

  const phone = normalizePhone(phoneRaw);
  const otp = otpRaw.trim();
  if (!isValidVnPhone(phone)) return { ok: false, error: MSG_PHONE_INVALID };
  if (!otp) return { ok: false, error: MSG_OTP_REQUIRED };

  const result = await verifyOtp({ phone, purpose: "verify", otp });
  if (result !== "ok") return { ok: false, error: otpErrorMsg(result) };

  const admin = createAdminClient();

  // Race guard: re-check ownership immediately before writing (phone is UNIQUE).
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (owner && owner.id !== userId) return { ok: false, error: MSG_PHONE_TAKEN };

  const { error: upErr } = await admin
    .from("profiles")
    .update({
      phone,
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (upErr) return { ok: false, error: MSG_GENERIC };

  // Link every historical row attributable to this phone (BYO + iPOS orders).
  // Mints NO stamps — earning starts at verification (TSK-155). Idempotent.
  const summary = await backfillForVerifiedPhone(
    createSupabaseBackfillStore(admin),
    phone,
    userId
  );

  revalidatePath("/account/profile");
  revalidatePath("/account");

  return {
    ok: true,
    maskedPhone: maskPhone(phone),
    byoBowlsLinked: summary.byoBowlsLinked,
    iposOrdersLinked: summary.iposOrdersLinked,
    orderItemsLinked: summary.orderItemsLinked,
  };
}
