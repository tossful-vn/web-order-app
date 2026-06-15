/**
 * TSK-156 — durable Zalo OA access-token auto-refresh.
 *
 * Covers the token core (cached when fresh, refresh+persist the ROTATED
 * refresh_token when expired, the rotated token is used on the next refresh,
 * no-row → null mock-trigger, refresh failure surfaces) and the zaloZns mock
 * fallback when OA creds are absent.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  getValidOaAccessTokenWith,
  type OaTokenStore,
  type OaTokenRow,
  type OaTokenRefresher,
} from "@/lib/auth/zaloOaToken";
import { sendZnsOtp } from "@/lib/auth/zaloZns";

const T0 = 1_780_000_000_000; // fixed epoch ms
const HOUR_MS = 3600 * 1000;

/* ───────────────────── in-memory OaTokenStore ───────────────────── */

function memOaStore(initial: OaTokenRow | null) {
  let row = initial;
  const persisted: Array<{
    oa_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }> = [];
  const store: OaTokenStore = {
    async read() {
      return row;
    },
    async persist(p) {
      persisted.push(p);
      row = { ...p, updated_at: new Date().toISOString() };
    },
  };
  return { store, persisted, current: () => row };
}

/** Refresher that rotates the token on every call so we can assert rotation. */
function rotatingRefresher() {
  const calls: string[] = [];
  let n = 0;
  const refresh: OaTokenRefresher = async (rt) => {
    calls.push(rt);
    n += 1;
    return { access_token: `access-${n}`, refresh_token: `refresh-${n}`, expires_in: 3600 };
  };
  return { refresh, calls };
}

function rowExpiringAt(expiresAtMs: number, overrides: Partial<OaTokenRow> = {}): OaTokenRow {
  return {
    oa_id: "oa-1",
    access_token: "cached-token",
    refresh_token: "refresh-0",
    expires_at: new Date(expiresAtMs).toISOString(),
    updated_at: new Date(T0).toISOString(),
    ...overrides,
  };
}

/* ───────────────────────── token core ───────────────────────── */

test("getValidOaAccessTokenWith — returns cached token when not near expiry", async () => {
  // Expires in 1 hour — well outside the 5-min skew → no refresh.
  const mem = memOaStore(rowExpiringAt(T0 + HOUR_MS));
  const { refresh, calls } = rotatingRefresher();

  const token = await getValidOaAccessTokenWith(mem.store, refresh, T0);

  assert.equal(token, "cached-token");
  assert.equal(calls.length, 0, "no refresh when the cached token is still fresh");
  assert.equal(mem.persisted.length, 0, "nothing persisted on the cached path");
});

test("getValidOaAccessTokenWith — refreshes + persists the NEW refresh_token when expired", async () => {
  // Only 1 minute left (< 5-min skew) → must refresh.
  const mem = memOaStore(rowExpiringAt(T0 + 60_000, { access_token: "old", refresh_token: "refresh-0" }));
  const { refresh, calls } = rotatingRefresher();

  const token = await getValidOaAccessTokenWith(mem.store, refresh, T0);

  assert.equal(token, "access-1", "returns the freshly minted access token");
  assert.deepEqual(calls, ["refresh-0"], "refresh used the current refresh_token");
  assert.equal(mem.persisted.length, 1);
  assert.equal(mem.persisted[0].access_token, "access-1");
  assert.equal(mem.persisted[0].refresh_token, "refresh-1", "the NEW rotated refresh_token is persisted");
  assert.equal(
    mem.persisted[0].expires_at,
    new Date(T0 + HOUR_MS).toISOString(),
    "expires_at advanced by expires_in"
  );
});

test("getValidOaAccessTokenWith — uses the rotated refresh_token on the next refresh", async () => {
  const mem = memOaStore(rowExpiringAt(T0 + 60_000, { access_token: "old", refresh_token: "refresh-0" }));
  const { refresh, calls } = rotatingRefresher();

  // First refresh: refresh-0 → refresh-1, new token valid until T0 + 1h.
  await getValidOaAccessTokenWith(mem.store, refresh, T0);
  // Second call at the new expiry → must refresh again, this time with refresh-1.
  const token2 = await getValidOaAccessTokenWith(mem.store, refresh, T0 + HOUR_MS);

  assert.equal(token2, "access-2");
  assert.deepEqual(calls, ["refresh-0", "refresh-1"], "second refresh uses the rotated token");
  assert.equal(mem.current()!.refresh_token, "refresh-2", "store now holds the latest rotated token");
});

test("getValidOaAccessTokenWith — missing access_token forces a refresh even if expiry is far", async () => {
  const mem = memOaStore(rowExpiringAt(T0 + HOUR_MS, { access_token: "" }));
  const { refresh, calls } = rotatingRefresher();

  const token = await getValidOaAccessTokenWith(mem.store, refresh, T0);

  assert.equal(token, "access-1");
  assert.equal(calls.length, 1, "an empty access_token always refreshes (seed path)");
});

test("getValidOaAccessTokenWith — no token row returns null (mock trigger)", async () => {
  const mem = memOaStore(null);
  const { refresh, calls } = rotatingRefresher();

  const token = await getValidOaAccessTokenWith(mem.store, refresh, T0);

  assert.equal(token, null, "unseeded store → null so the caller mocks");
  assert.equal(calls.length, 0, "no refresh attempted without a row");
});

test("getValidOaAccessTokenWith — refresh failure surfaces (does not swallow)", async () => {
  const mem = memOaStore(rowExpiringAt(T0 + 60_000));
  const failing: OaTokenRefresher = async () => {
    throw new Error("Zalo OA token refresh failed: invalid refresh_token");
  };

  await assert.rejects(
    () => getValidOaAccessTokenWith(mem.store, failing, T0),
    /invalid refresh_token/
  );
  assert.equal(mem.persisted.length, 0, "nothing persisted on a failed refresh");
});

/* ───────────────────── zaloZns mock fallback ───────────────────── */

test("sendZnsOtp — mocks (logs + ok) when OA app creds are absent", async () => {
  // Guard: the live OA creds must be unset for the mock path under test.
  assert.ok(
    !process.env.ZALO_OA_APP_ID &&
      !process.env.ZALO_OA_APP_SECRET &&
      !process.env.ZALO_ZNS_TEMPLATE_ID,
    "OA creds must be unset for the mock-path test"
  );

  const logs: string[] = [];
  const orig = console.log;
  console.log = (...a: unknown[]) => {
    logs.push(a.join(" "));
  };
  try {
    const res = await sendZnsOtp("0936336649", "123456");
    assert.deepEqual(res, { ok: true, mocked: true });
  } finally {
    console.log = orig;
  }
  assert.ok(
    logs.some((l) => l.includes("[ZNS MOCK]") && l.includes("123456")),
    "mock logs the OTP server-side"
  );
});
