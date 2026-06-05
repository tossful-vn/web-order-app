// NOTE: server-only module — imported solely by "use server" actions. Uses node
// crypto + the service-role admin client, neither of which is browser-safe.
import { createHash, randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/auth/phone";

/**
 * Phone OTP issuance + verification for signup and password reset (TSK-127).
 *
 * Design: OTP verifies phone OWNERSHIP at signup + reset only — it is NOT used
 * for daily login (cost optimization, locked D5). Codes are 6 digits, hashed
 * (SHA-256) before storage, valid 5 minutes, max 5 attempts.
 *
 * Delivery is Zalo ZNS. Until the Zalo Developer credentials are provisioned
 * (Hiếu is mid-setup at developers.zalo.me), STUB mode logs the code to the
 * server console instead of sending. Verification logic stays REAL in stub mode
 * so the expiry / attempt-lockout paths are exercisable.
 *
 * TODO before prod: set ZALO_* env vars and implement sendViaZaloZns() below.
 */

export type OtpPurpose = "signup" | "reset";
export type VerifyResult =
  | "ok"
  | "expired"
  | "too_many_attempts"
  | "invalid"
  | "not_found";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Stubbed unless every Zalo credential is present in the environment. */
const ZALO_READY = Boolean(
  process.env.ZALO_OA_ACCESS_TOKEN && process.env.ZALO_ZNS_OTP_TEMPLATE_ID
);

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function generateOtp(): string {
  // randomInt is cryptographically secure; pad to a fixed 6-digit string.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Generate, store (hashed), and send an OTP for the given phone + purpose.
 * Replaces any prior pending code for the same (phone, purpose) so a re-request
 * always supersedes the old one. Returns void; callers should not branch on
 * whether delivery is stubbed (the customer flow is identical).
 */
export async function requestOtp(args: {
  phone: string;
  purpose: OtpPurpose;
}): Promise<void> {
  const phone = normalizePhone(args.phone);
  const admin = createAdminClient();
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  // Clear previous pending codes for this phone+purpose, then insert the fresh one.
  await admin
    .from("phone_otp_pending")
    .delete()
    .eq("phone", phone)
    .eq("purpose", args.purpose);

  const { error } = await admin.from("phone_otp_pending").insert({
    phone,
    otp_hash: hashOtp(otp),
    purpose: args.purpose,
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);

  await sendOtp(phone, otp, args.purpose);
}

/**
 * Verify a submitted OTP. On success the pending row is consumed (deleted).
 * On a wrong code the attempt counter is incremented and the row kept until
 * it either passes, expires, or exceeds MAX_ATTEMPTS.
 */
export async function verifyOtp(args: {
  phone: string;
  purpose: OtpPurpose;
  otp: string;
}): Promise<VerifyResult> {
  const phone = normalizePhone(args.phone);
  const otp = args.otp.trim();
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("phone_otp_pending")
    .select("id, otp_hash, expires_at, attempts")
    .eq("phone", phone)
    .eq("purpose", args.purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return "not_found";

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from("phone_otp_pending").delete().eq("id", row.id);
    return "expired";
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await admin.from("phone_otp_pending").delete().eq("id", row.id);
    return "too_many_attempts";
  }

  if (hashOtp(otp) !== row.otp_hash) {
    const nextAttempts = row.attempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      await admin.from("phone_otp_pending").delete().eq("id", row.id);
      return "too_many_attempts";
    }
    await admin
      .from("phone_otp_pending")
      .update({ attempts: nextAttempts })
      .eq("id", row.id);
    return "invalid";
  }

  await admin.from("phone_otp_pending").delete().eq("id", row.id);
  return "ok";
}

async function sendOtp(
  phone: string,
  otp: string,
  purpose: OtpPurpose
): Promise<void> {
  if (!ZALO_READY) {
    // STUB: no Zalo credentials yet. Print the code so dev/staging can complete
    // the flow. Verification still runs against the stored hash, so expiry and
    // attempt-lockout behave exactly as in prod.
    console.log(
      `[otp:stub] phone=${phone} purpose=${purpose} code=${otp} ` +
        `(Zalo ZNS not configured — set ZALO_* env vars to send for real)`
    );
    return;
  }
  await sendViaZaloZns(phone, otp);
}

/**
 * Real Zalo ZNS OTP send. Stubbed until credentials land (TSK-127.5).
 * When implementing: POST the pre-approved template (ZALO_ZNS_OTP_TEMPLATE_ID)
 * to https://business.openapi.zalo.me/message/template with the current
 * ZALO_OA_ACCESS_TOKEN, passing { phone, template_data: { otp } }. Refresh the
 * access token (valid ~1h) via the refresh token when it 401s.
 */
async function sendViaZaloZns(_phone: string, _otp: string): Promise<void> {
  throw new Error(
    "Zalo ZNS send not implemented yet (TSK-127.5). Unset ZALO_* to use the stub."
  );
}
