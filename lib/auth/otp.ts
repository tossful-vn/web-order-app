// NOTE: server-only module — imported solely by "use server" actions. Uses node
// crypto + the service-role admin client, neither of which is browser-safe.
import { createHash, randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/auth/phone";
import { sendZnsOtp } from "@/lib/auth/zaloZns";

/**
 * Phone OTP issuance + verification (TSK-127 signup/reset; TSK-149 retro-verify).
 *
 * Codes are 6 digits, hashed (SHA-256) before storage, valid 5 minutes, max 5
 * verify attempts, and rate-limited to 1 send / 60s / phone. Delivery is Zalo
 * ZNS (see lib/auth/zaloZns.ts) which mocks itself until credentials land, so
 * verification logic stays REAL in mock mode and every guard path is exercisable
 * end-to-end without creds.
 *
 * The core (requestOtpWith / verifyOtpWith) talks to a tiny OtpStore + OtpSender
 * port so the expiry / wrong-code / lockout / rate-limit paths unit-test against
 * an in-memory fake — mirroring the StampStore / ByoStore pattern in lib/ipos.
 * The public requestOtp / verifyOtp wire the live Supabase + ZNS adapters.
 */

export type OtpPurpose = "signup" | "reset" | "verify";

export type VerifyResult =
  | "ok"
  | "expired"
  | "too_many_attempts"
  | "invalid"
  | "not_found";

export type RequestOtpResult =
  | { ok: true; mocked: boolean }
  | { ok: false; reason: "rate_limited"; retryAfterSec: number }
  | { ok: false; reason: "send_failed"; error: string };

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
/** Rate limit: one send per phone per 60s (across every purpose). */
const SEND_COOLDOWN_MS = 60 * 1000;

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function generateOtp(): string {
  // randomInt is cryptographically secure; pad to a fixed 6-digit string.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/* ─────────────────────────── ports ─────────────────────────── */

export type OtpPendingRow = {
  id: string;
  phone: string;
  otp_hash: string;
  purpose: OtpPurpose;
  expires_at: string; // ISO
  attempts: number;
  created_at: string; // ISO
};

/** Row written on a fresh request (id/attempts are assigned by the store/DB). */
export type NewOtpRow = {
  phone: string;
  otp_hash: string;
  purpose: OtpPurpose;
  expires_at: string;
  created_at: string;
};

/** The narrow set of DB operations the OTP core needs. */
export interface OtpStore {
  /** Most recent pending row for this phone (ANY purpose) — the rate-limit gate. */
  latestForPhone(phone: string): Promise<Pick<OtpPendingRow, "created_at"> | null>;
  /** Clear pending rows for (phone, purpose) before inserting a fresh code. */
  deleteForPhonePurpose(phone: string, purpose: OtpPurpose): Promise<void>;
  insert(row: NewOtpRow): Promise<void>;
  /** Latest pending row for (phone, purpose). */
  latest(phone: string, purpose: OtpPurpose): Promise<OtpPendingRow | null>;
  setAttempts(id: string, attempts: number): Promise<void>;
  deleteById(id: string): Promise<void>;
}

/** Delivery port. Returns a result; never throws on a delivery problem. */
export type OtpSender = (
  phone: string,
  code: string
) => Promise<{ ok: true; mocked: boolean } | { ok: false; error: string }>;

/* ─────────────────────────── core ─────────────────────────── */

/**
 * Generate, store (hashed), and send an OTP. Enforces the 1-send/60s/phone
 * rate limit BEFORE touching the pending row, so a too-soon re-request leaves
 * the still-valid prior code intact and reports `rate_limited`. `now` is
 * injectable for deterministic tests.
 */
export async function requestOtpWith(
  store: OtpStore,
  sender: OtpSender,
  args: { phone: string; purpose: OtpPurpose },
  now: number = Date.now()
): Promise<RequestOtpResult> {
  const phone = normalizePhone(args.phone);

  const recent = await store.latestForPhone(phone);
  if (recent) {
    const ageMs = now - Date.parse(recent.created_at);
    if (ageMs >= 0 && ageMs < SEND_COOLDOWN_MS) {
      return {
        ok: false,
        reason: "rate_limited",
        retryAfterSec: Math.ceil((SEND_COOLDOWN_MS - ageMs) / 1000),
      };
    }
  }

  const otp = generateOtp();
  await store.deleteForPhonePurpose(phone, args.purpose);
  await store.insert({
    phone,
    otp_hash: hashOtp(otp),
    purpose: args.purpose,
    expires_at: new Date(now + OTP_TTL_MS).toISOString(),
    created_at: new Date(now).toISOString(),
  });

  const send = await sender(phone, otp);
  if (!send.ok) return { ok: false, reason: "send_failed", error: send.error };
  return { ok: true, mocked: send.mocked };
}

/**
 * Verify a submitted OTP. On success the pending row is consumed (deleted). On
 * a wrong code the attempt counter is incremented and the row kept until it
 * passes, expires, or hits MAX_ATTEMPTS. `now` is injectable for tests.
 */
export async function verifyOtpWith(
  store: OtpStore,
  args: { phone: string; purpose: OtpPurpose; otp: string },
  now: number = Date.now()
): Promise<VerifyResult> {
  const phone = normalizePhone(args.phone);
  const otp = args.otp.trim();

  const row = await store.latest(phone, args.purpose);
  if (!row) return "not_found";

  if (Date.parse(row.expires_at) < now) {
    await store.deleteById(row.id);
    return "expired";
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await store.deleteById(row.id);
    return "too_many_attempts";
  }

  if (hashOtp(otp) !== row.otp_hash) {
    const nextAttempts = row.attempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      await store.deleteById(row.id);
      return "too_many_attempts";
    }
    await store.setAttempts(row.id, nextAttempts);
    return "invalid";
  }

  await store.deleteById(row.id);
  return "ok";
}

/* ──────────────────── live Supabase adapter ──────────────────── */

const OTP_COLS = "id, phone, otp_hash, purpose, expires_at, attempts, created_at";

/** OtpStore backed by a (service-role) admin client. RLS-on, no policies. */
export function createSupabaseOtpStore(
  admin: ReturnType<typeof createAdminClient>
): OtpStore {
  return {
    async latestForPhone(phone) {
      const { data } = await admin
        .from("phone_otp_pending")
        .select("created_at")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
    async deleteForPhonePurpose(phone, purpose) {
      await admin
        .from("phone_otp_pending")
        .delete()
        .eq("phone", phone)
        .eq("purpose", purpose);
    },
    async insert(row) {
      const { error } = await admin.from("phone_otp_pending").insert(row);
      if (error) throw new Error(error.message);
    },
    async latest(phone, purpose) {
      const { data } = await admin
        .from("phone_otp_pending")
        .select(OTP_COLS)
        .eq("phone", phone)
        .eq("purpose", purpose)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as OtpPendingRow | null) ?? null;
    },
    async setAttempts(id, attempts) {
      await admin.from("phone_otp_pending").update({ attempts }).eq("id", id);
    },
    async deleteById(id) {
      await admin.from("phone_otp_pending").delete().eq("id", id);
    },
  };
}

/* ──────────────────── public entry points ──────────────────── */

/** Live OTP request: Supabase store + Zalo ZNS sender (mocks without creds). */
export async function requestOtp(args: {
  phone: string;
  purpose: OtpPurpose;
}): Promise<RequestOtpResult> {
  const store = createSupabaseOtpStore(createAdminClient());
  return requestOtpWith(store, sendZnsOtp, args);
}

/** Live OTP verify against the Supabase store. */
export async function verifyOtp(args: {
  phone: string;
  purpose: OtpPurpose;
  otp: string;
}): Promise<VerifyResult> {
  const store = createSupabaseOtpStore(createAdminClient());
  return verifyOtpWith(store, args);
}
