/**
 * Seed the INITIAL Zalo OA token row (TSK-156).
 *
 * The durable token store (public.zalo_oa_tokens) needs one bootstrap row: the
 * rotating refresh_token Hieu saved from the Zalo API Explorer / OAuth callback,
 * plus (optionally) the current access_token + its expiry. After this, the app
 * auto-refreshes the rotating pair on demand (see lib/auth/zaloOaToken.ts) — this
 * script never needs to be re-run unless the refresh_token chain is ever broken
 * (e.g. > token lifetime with no refresh) and must be re-bootstrapped.
 *
 * Usage:
 *   # Minimal — seed only the refresh_token; the access_token is minted on first
 *   # send (expires_at defaults to "now", forcing an immediate refresh):
 *   npx tsx scripts/seed-zalo-token.ts \
 *     --oa-id <OA_ID> --refresh-token <REFRESH_TOKEN>
 *
 *   # Full — also seed a current access_token valid for --expires-in seconds:
 *   npx tsx scripts/seed-zalo-token.ts \
 *     --oa-id <OA_ID> --refresh-token <RT> --access-token <AT> --expires-in 3600
 *
 *   # via package.json: npm run seed:zalo-token -- --oa-id <…> --refresh-token <…>
 *
 * Re-runnable: upserts the singleton row by oa_id (overwrites in place).
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (the row is
 * server-only; RLS-on, no policies). Find the refresh_token via the OA OAuth
 * flow at developers.zalo.me (API Explorer → grant the app → copy refresh_token).
 */
import { createAdminClient } from "@/lib/supabase/admin";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) args[a.slice(2)] = argv[++i];
  }
  return args;
}

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const oaId = args["oa-id"] ?? process.env.ZALO_OA_ID;
  const refreshToken = args["refresh-token"] ?? process.env.ZALO_OA_REFRESH_TOKEN;
  const accessToken = args["access-token"] ?? "";
  const expiresIn = Number(args["expires-in"] ?? 0);

  if (!oaId) fail("--oa-id is required (the Official Account id).");
  if (!refreshToken) fail("--refresh-token is required (from the Zalo OAuth flow).");

  // With no access_token, expire immediately so the first send refreshes; with an
  // access_token, honour the provided lifetime.
  const ttlMs = accessToken ? Math.max(expiresIn, 1) * 1000 : 0;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  const admin = createAdminClient();
  const { error } = await admin.from("zalo_oa_tokens").upsert(
    {
      oa_id: oaId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "oa_id" }
  );
  if (error) fail(`Seed failed: ${error.message}`);

  console.log(
    `✓ Seeded zalo_oa_tokens (oa_id=${oaId}); ` +
      `access_token ${accessToken ? "set" : "empty → minted on first send"}; ` +
      `expires_at=${expiresAt}`
  );
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
