// NOTE: server-only module — uses fetch + server env + the service-role admin
// client + console. NEVER import from a client component; it reads/writes the
// Zalo OA secret credentials.
//
// Durable Zalo OA access-token management (TSK-156).
//
// Zalo OA access tokens expire (OAuth v4) and — critically — the refresh_token
// ROTATES on every refresh. A static ZALO_OA_ACCESS_TOKEN env therefore stops
// working an hour or so after it is minted. This module keeps the rotating pair
// in public.zalo_oa_tokens (RLS-on, no policies → service-role only) and mints a
// fresh access_token on demand:
//
//   getValidOaAccessToken()
//     → read the singleton token row (service-role client)
//     → if access_token is present AND expires_at is > 5 min away → return it
//     → else POST the current refresh_token to Zalo OAuth v4, persist the NEW
//       access_token + NEW refresh_token + new expires_at, and return the fresh
//       access_token.
//     → if no row is seeded yet → return null (caller falls back to mock).
//
// ROTATION RACE: two concurrent refreshes would each burn the same refresh_token;
// the second persist would overwrite the first with a now-stale token. OTP volume
// is low (one send / 60s / phone) and sends are far apart, so a plain
// read → refresh → write is acceptable here — we deliberately do NOT add a lock /
// row-version CAS. Revisit if OA usage ever fans out to high-concurrency sends.

import { createAdminClient } from "@/lib/supabase/admin";

/** Zalo OAuth v4 OA token endpoint (refresh + initial code exchange). */
const REFRESH_ENDPOINT = "https://oauth.zaloapp.com/v4/oa/access_token";

/** Refresh proactively when the token is within this window of expiry. */
const REFRESH_SKEW_MS = 5 * 60 * 1000;

export type OaTokenRow = {
  oa_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO
  updated_at: string; // ISO
};

/** The rotated credential persisted after a successful refresh. */
export type RotatedToken = {
  oa_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO
};

/* ─────────────────────────── ports ─────────────────────────── */

/** The narrow set of DB operations the token core needs. */
export interface OaTokenStore {
  /** The singleton token row, or null when none has been seeded yet. */
  read(): Promise<OaTokenRow | null>;
  /** Persist the rotated access_token + refresh_token + expiry (keyed by oa_id). */
  persist(row: RotatedToken): Promise<void>;
}

/** Refresh port. Returns the new (rotated) token triple; throws on failure. */
export type OaTokenRefresher = (
  refreshToken: string
) => Promise<{ access_token: string; refresh_token: string; expires_in: number }>;

/* ─────────────────────────── core ─────────────────────────── */

/**
 * Return a valid OA access_token, refreshing + persisting the rotated credential
 * when the cached one is missing or about to expire. Returns null when no token
 * row exists (the caller treats that as "not configured" → mock). Throws when a
 * refresh is required but fails. `now` is injectable for deterministic tests.
 */
export async function getValidOaAccessTokenWith(
  store: OaTokenStore,
  refresh: OaTokenRefresher,
  now: number = Date.now()
): Promise<string | null> {
  const row = await store.read();
  if (!row) return null; // not seeded → caller falls back to mock

  const expiresAtMs = Date.parse(row.expires_at);
  const stillFresh =
    Boolean(row.access_token) &&
    Number.isFinite(expiresAtMs) &&
    expiresAtMs - now > REFRESH_SKEW_MS;
  if (stillFresh) return row.access_token;

  let rotated: Awaited<ReturnType<OaTokenRefresher>>;
  try {
    rotated = await refresh(row.refresh_token);
  } catch (e) {
    // Log here (the throw site has the most context) and re-throw a clear error.
    console.error("[ZALO OA] access-token refresh failed:", e);
    throw e instanceof Error ? e : new Error(String(e));
  }

  const expires_at = new Date(now + rotated.expires_in * 1000).toISOString();
  // Persist the NEW refresh_token atomically with the new access_token — the old
  // refresh_token is now spent; the next refresh MUST use rotated.refresh_token.
  await store.persist({
    oa_id: row.oa_id,
    access_token: rotated.access_token,
    refresh_token: rotated.refresh_token,
    expires_at,
  });
  return rotated.access_token;
}

/* ──────────────────── live Zalo OAuth v4 refresher ──────────────────── */

/**
 * Refresh the OA access_token via Zalo OAuth v4. The refresh_token rotates on
 * every call — the response carries a NEW refresh_token the caller must persist.
 *
 * POST https://oauth.zaloapp.com/v4/oa/access_token
 *   header  secret_key: <ZALO_OA_APP_SECRET>
 *   body    (x-www-form-urlencoded) refresh_token, app_id, grant_type=refresh_token
 *   resp    { access_token, refresh_token, expires_in }   (expires_in is seconds)
 */
export async function zaloOaRefresh(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const appId = process.env.ZALO_OA_APP_ID;
  const appSecret = process.env.ZALO_OA_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      "ZALO_OA_APP_ID and ZALO_OA_APP_SECRET must be set to refresh the Zalo OA access token."
    );
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    app_id: appId,
    grant_type: "refresh_token",
  });

  let res: Response;
  try {
    res = await fetch(REFRESH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: appSecret,
      },
      body: body.toString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Zalo OA token refresh network error: ${msg}`);
  }

  // Success: { access_token, refresh_token, expires_in }. Failure: an `error`
  // (+ error_name/error_description) envelope, sometimes still with HTTP 200.
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: string | number;
    error?: number | string;
    error_name?: string;
    error_description?: string;
    message?: string;
  };

  if (!res.ok || !json.access_token || !json.refresh_token) {
    const detail =
      json.error_description ||
      json.error_name ||
      json.message ||
      (json.error != null ? `error ${json.error}` : `HTTP ${res.status}`);
    throw new Error(`Zalo OA token refresh failed: ${detail}`);
  }

  const expiresIn = Number(json.expires_in);
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    // Default to the documented ~1h if Zalo omits/garbles expires_in.
    expires_in: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600,
  };
}

/* ──────────────────── live Supabase token store ──────────────────── */

const OA_TOKEN_COLS = "oa_id, access_token, refresh_token, expires_at, updated_at";

/** OaTokenStore backed by the (service-role) admin client. RLS-on, no policies. */
export function createSupabaseOaTokenStore(
  admin: ReturnType<typeof createAdminClient>
): OaTokenStore {
  return {
    async read() {
      // Singleton table; newest row defensively (one OA today).
      const { data } = await admin
        .from("zalo_oa_tokens")
        .select(OA_TOKEN_COLS)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as OaTokenRow | null) ?? null;
    },
    async persist(row) {
      const { error } = await admin
        .from("zalo_oa_tokens")
        .update({
          access_token: row.access_token,
          refresh_token: row.refresh_token,
          expires_at: row.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq("oa_id", row.oa_id);
      if (error) throw new Error(error.message);
    },
  };
}

/* ──────────────────── public entry point ──────────────────── */

/**
 * Live entry point: a valid OA access_token from the Supabase-backed store,
 * refreshing via Zalo OAuth v4 when needed. Returns null when no token row has
 * been seeded (callers fall back to mock). See scripts/seed-zalo-token.ts.
 */
export async function getValidOaAccessToken(): Promise<string | null> {
  const store = createSupabaseOaTokenStore(createAdminClient());
  return getValidOaAccessTokenWith(store, zaloOaRefresh);
}
