/**
 * GET /api/zalo/oauth — one-time Zalo OA OAuth v4 authorization-code flow
 * (TSK-156.2). Obtains a SEEDABLE refresh_token for durable OTP.
 *
 * Why this exists: the refresh_token shown in the Zalo API Explorer (OA mode) is
 * already spent, so Zalo rejects it on refresh ("Invalid refresh token"). Only a
 * fresh authorization-code grant yields a refresh_token that getValidOaAccessToken
 * (TSK-156) can keep rotating. Run this once as the OA admin; the token then
 * self-refreshes forever.
 *
 * Phase 1 (no code):  GET /api/zalo/oauth?key=<ZALO_OAUTH_SETUP_KEY>
 *                     → 302 to Zalo's OA permission page (state carries the key).
 * Phase 2 (callback): Zalo → GET /api/zalo/oauth?oauth_code=...&state=<key>
 *                     → exchange code → store fresh access+refresh in
 *                       public.zalo_oa_tokens (service-role) → JSON ok.
 *
 * Setup: register redirect URI  <origin>/api/zalo/oauth  in the Zalo app's OA
 * callback settings, and set env ZALO_OAUTH_SETUP_KEY (any value you choose).
 * Reuses ZALO_OA_APP_ID + ZALO_OA_APP_SECRET (already set for refresh).
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Node runtime: service-role client + server secrets (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERMISSION_URL = "https://oauth.zaloapp.com/v4/oa/permission";
const TOKEN_ENDPOINT = "https://oauth.zaloapp.com/v4/oa/access_token";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;

  const setupKey = process.env.ZALO_OAUTH_SETUP_KEY;
  const appId = process.env.ZALO_OA_APP_ID;
  const appSecret = process.env.ZALO_OA_APP_SECRET;
  if (!setupKey) {
    return NextResponse.json(
      { error: "ZALO_OAUTH_SETUP_KEY is not set" },
      { status: 503 }
    );
  }
  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "ZALO_OA_APP_ID / ZALO_OA_APP_SECRET are not set" },
      { status: 503 }
    );
  }

  const code = url.searchParams.get("oauth_code") || url.searchParams.get("code");
  const redirectUri = `${url.origin}/api/zalo/oauth`;

  // ── Phase 1: kick off authorization (guarded by ?key=) ──
  if (!code) {
    if (url.searchParams.get("key") !== setupKey) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const auth = new URL(PERMISSION_URL);
    auth.searchParams.set("app_id", appId);
    auth.searchParams.set("redirect_uri", redirectUri);
    auth.searchParams.set("state", setupKey);
    return NextResponse.redirect(auth.toString());
  }

  // ── Phase 2: exchange the authorization code for a fresh token pair ──
  if (url.searchParams.get("state") !== setupKey) {
    return NextResponse.json({ error: "bad state" }, { status: 401 });
  }

  const body = new URLSearchParams({
    code,
    app_id: appId,
    grant_type: "authorization_code",
  });

  let res: Response;
  try {
    res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: appSecret,
      },
      body: body.toString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Zalo code exchange network error: ${msg}` },
      { status: 502 }
    );
  }

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
    return NextResponse.json(
      { error: `Zalo code exchange failed: ${detail}` },
      { status: 502 }
    );
  }

  const expiresIn = Number(json.expires_in);
  const expires_at = new Date(
    Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000
  ).toISOString();

  const admin = createAdminClient();
  // Singleton table (one OA today); keep the existing row's oa_id if present so
  // the upsert updates it in place, else fall back to ZALO_OA_ID env.
  const { data: existing } = await admin
    .from("zalo_oa_tokens")
    .select("oa_id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const oa_id = existing?.oa_id || process.env.ZALO_OA_ID || "default";

  const { error } = await admin.from("zalo_oa_tokens").upsert(
    {
      oa_id,
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "oa_id" }
  );
  if (error) {
    return NextResponse.json(
      { error: `Failed to store token: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "Zalo OA token seeded via authorization-code grant. OTP is now durable (auto-refresh).",
    oa_id,
    expires_at,
  });
}
