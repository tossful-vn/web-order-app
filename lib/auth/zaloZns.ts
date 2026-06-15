// NOTE: server-only module — uses fetch + server env + console. Never import
// from a client component.
//
// Zalo ZNS (Zalo Notification Service) OTP delivery (TSK-149, TSK-156).
//
// This adapter is the REAL send wired behind an env gate: when the OA app creds
// (ZALO_OA_APP_ID + ZALO_OA_APP_SECRET) and a ZNS template (ZALO_ZNS_OTP_TEMPLATE_ID)
// are present, it acquires a DURABLE access_token from lib/auth/zaloOaToken (which
// auto-refreshes the rotating OA token — TSK-156) and POSTs to the ZNS template
// API. Otherwise — or until the initial OA token row is seeded — it MOCKS (logs
// the code server-side, returns ok) so the whole OTP + verify + back-fill flow
// builds, tests, and runs end-to-end without creds.

import { getValidOaAccessToken } from "@/lib/auth/zaloOaToken";

/** ZNS template send endpoint (Official Account messaging). */
const ZNS_ENDPOINT = "https://business.openapi.zalo.me/message/template";

export type ZnsSendResult =
  | { ok: true; mocked: boolean }
  | { ok: false; error: string; tokenExpired: boolean };

/**
 * OA app creds + a ZNS template present → attempt a real send. The access token
 * itself is managed in the DB (see getValidOaAccessToken), so this gates on the
 * app credentials, not a static token. Read lazily so tests/env-swaps take effect.
 */
function znsConfigured(): boolean {
  return Boolean(
    process.env.ZALO_OA_APP_ID &&
      process.env.ZALO_OA_APP_SECRET &&
      process.env.ZALO_ZNS_OTP_TEMPLATE_ID
  );
}

/**
 * Convert the canonical VN local key ("0XXXXXXXXX", the same form TSK-148's
 * normalizeIposPhone produces) to the 84-prefixed form ZNS requires
 * ("84XXXXXXXXX"). Idempotent for already-84 / digit-only inputs.
 */
export function toZaloPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "84" + digits.slice(1);
  if (digits.startsWith("84")) return digits;
  return digits;
}

/**
 * Send a 6-digit OTP to `phone` via the approved ZNS template, or mock it when
 * credentials are absent. Returns a result object — callers never throw on a
 * delivery problem (a flat tyre on send shouldn't 500 the request); they
 * surface a "try again" message instead.
 *
 * ZNS limitation (noted, not solved here — TSK-149 scope): ZNS can only reach
 * numbers that have a Zalo account. Non-Zalo users can't receive the OTP; SMS
 * fallback is explicitly out of scope.
 */
export async function sendZnsOtp(
  phone: string,
  code: string
): Promise<ZnsSendResult> {
  if (!znsConfigured()) {
    // MOCK: no Zalo credentials. Print the code so dev/staging completes the
    // flow; verification still runs against the stored hash, so expiry and
    // attempt-lockout behave exactly as in prod.
    console.log(`[ZNS MOCK] OTP ${code} -> ${phone}`);
    return { ok: true, mocked: true };
  }

  // Acquire a fresh, auto-refreshed OA access token (TSK-156). A refresh failure
  // is a token problem → report it (tokenExpired) without crashing the request.
  let accessToken: string | null;
  try {
    accessToken = await getValidOaAccessToken();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `ZNS token error: ${msg}`, tokenExpired: true };
  }
  if (!accessToken) {
    // Creds are configured but no OA token row is seeded yet — mock so the flow
    // still completes. Seed it with scripts/seed-zalo-token.ts to go live.
    console.log(
      `[ZNS MOCK] OTP ${code} -> ${phone} (no OA token row; seed scripts/seed-zalo-token.ts)`
    );
    return { ok: true, mocked: true };
  }

  const templateId = process.env.ZALO_ZNS_OTP_TEMPLATE_ID as string;

  const body = {
    phone: toZaloPhone(phone),
    template_id: templateId,
    // The pre-approved OTP template exposes a single {otp} parameter.
    template_data: { otp: code },
  };

  let res: Response;
  try {
    res = await fetch(ZNS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ZNS authenticates via the access_token header (not Bearer).
        access_token: accessToken,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `ZNS network error: ${msg}`, tokenExpired: false };
  }

  // ZNS replies 200 with a JSON envelope: { error: 0, message: "Success", ... }
  // on success; a non-zero `error` (and a message) on failure.
  const json = (await res.json().catch(() => ({}))) as {
    error?: number;
    message?: string;
  };
  const errCode = Number(json?.error ?? -1);
  if (res.ok && errCode === 0) {
    return { ok: true, mocked: false };
  }

  // -124 (invalid/expired access token) and -216 are Zalo's token errors; also
  // sniff the message so a refreshed error-code list still flags it. Report,
  // don't crash — Hieu refreshes the OA access token and retries.
  const message = json?.message ?? `HTTP ${res.status}`;
  const tokenExpired =
    errCode === -124 ||
    errCode === -216 ||
    /token|expired|access_token/i.test(message);

  return { ok: false, error: `ZNS error ${errCode}: ${message}`, tokenExpired };
}
