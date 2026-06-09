/**
 * TSK-149 — Zalo OTP retroactive phone verification.
 *
 * Covers the OTP core (expiry, wrong code, max attempts, rate-limit), the Zalo
 * ZNS mock-send path (no creds in env), and the idempotent back-fill that links
 * historical BYO bowls onto a verified phone.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  requestOtpWith,
  verifyOtpWith,
  type OtpStore,
  type OtpPendingRow,
  type OtpSender,
} from "@/lib/auth/otp";
import { sendZnsOtp, toZaloPhone } from "@/lib/auth/zaloZns";
import {
  backfillForVerifiedPhone,
  type BackfillStore,
} from "@/lib/loyalty/backfill";

/* ───────────────────────── in-memory OtpStore ───────────────────────── */

function memOtpStore() {
  const rows: OtpPendingRow[] = [];
  let seq = 0;
  const byNewest = (a: OtpPendingRow, b: OtpPendingRow) =>
    b.created_at.localeCompare(a.created_at);

  const store: OtpStore = {
    async latestForPhone(phone) {
      const r = rows.filter((x) => x.phone === phone).sort(byNewest)[0];
      return r ? { created_at: r.created_at } : null;
    },
    async deleteForPhonePurpose(phone, purpose) {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].phone === phone && rows[i].purpose === purpose) {
          rows.splice(i, 1);
        }
      }
    },
    async insert(row) {
      rows.push({ id: `otp-${++seq}`, attempts: 0, ...row });
    },
    async latest(phone, purpose) {
      return (
        rows
          .filter((x) => x.phone === phone && x.purpose === purpose)
          .sort(byNewest)[0] ?? null
      );
    },
    async setAttempts(id, attempts) {
      const r = rows.find((x) => x.id === id);
      if (r) r.attempts = attempts;
    },
    async deleteById(id) {
      const i = rows.findIndex((x) => x.id === id);
      if (i >= 0) rows.splice(i, 1);
    },
  };
  return { store, rows };
}

/** Sender that records the codes it "sends" so tests can verify them. */
function captureSender() {
  const sent: Array<{ phone: string; code: string }> = [];
  const sender: OtpSender = async (phone, code) => {
    sent.push({ phone, code });
    return { ok: true, mocked: true };
  };
  return { sender, sent };
}

const PHONE = "0936336649";
const T0 = 1_780_000_000_000; // fixed epoch ms

/* ───────────────────────── OTP core ───────────────────────── */

test("requestOtpWith — stores a fresh code and sends it", async () => {
  const { store, rows } = memOtpStore();
  const { sender, sent } = captureSender();

  const res = await requestOtpWith(store, sender, { phone: PHONE, purpose: "verify" }, T0);

  assert.deepEqual(res, { ok: true, mocked: true });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].phone, PHONE);
  assert.equal(rows[0].attempts, 0);
  assert.notEqual(rows[0].otp_hash, sent[0].code, "code is hashed, not stored plaintext");
  assert.match(sent[0].code, /^\d{6}$/);
});

test("verifyOtpWith — correct code returns ok and consumes the row", async () => {
  const { store, rows } = memOtpStore();
  const { sender, sent } = captureSender();
  await requestOtpWith(store, sender, { phone: PHONE, purpose: "verify" }, T0);

  const res = await verifyOtpWith(store, { phone: PHONE, purpose: "verify", otp: sent[0].code }, T0 + 1000);
  assert.equal(res, "ok");
  assert.equal(rows.length, 0, "pending row is consumed on success");
});

test("verifyOtpWith — expired code returns expired", async () => {
  const { store } = memOtpStore();
  const { sender, sent } = captureSender();
  await requestOtpWith(store, sender, { phone: PHONE, purpose: "verify" }, T0);

  // TTL is 5 min; verify 5 min + 1s later.
  const res = await verifyOtpWith(
    store,
    { phone: PHONE, purpose: "verify", otp: sent[0].code },
    T0 + 5 * 60 * 1000 + 1000
  );
  assert.equal(res, "expired");
});

test("verifyOtpWith — wrong code returns invalid (and increments attempts)", async () => {
  const { store, rows } = memOtpStore();
  const { sender, sent } = captureSender();
  await requestOtpWith(store, sender, { phone: PHONE, purpose: "verify" }, T0);

  const wrong = sent[0].code === "000000" ? "111111" : "000000";
  const res = await verifyOtpWith(store, { phone: PHONE, purpose: "verify", otp: wrong }, T0 + 1000);
  assert.equal(res, "invalid");
  assert.equal(rows[0].attempts, 1);
});

test("verifyOtpWith — max attempts: 4 wrong then a 5th wrong locks out", async () => {
  const { store, rows } = memOtpStore();
  const { sender, sent } = captureSender();
  await requestOtpWith(store, sender, { phone: PHONE, purpose: "verify" }, T0);
  const wrong = sent[0].code === "000000" ? "111111" : "000000";

  for (let i = 0; i < 4; i++) {
    const r = await verifyOtpWith(store, { phone: PHONE, purpose: "verify", otp: wrong }, T0 + 1000);
    assert.equal(r, "invalid", `attempt ${i + 1} is invalid`);
  }
  const locked = await verifyOtpWith(store, { phone: PHONE, purpose: "verify", otp: wrong }, T0 + 1000);
  assert.equal(locked, "too_many_attempts");
  assert.equal(rows.length, 0, "row is consumed on lockout");

  // After lockout the correct code can't be used either (row is gone).
  const after = await verifyOtpWith(store, { phone: PHONE, purpose: "verify", otp: sent[0].code }, T0 + 1000);
  assert.equal(after, "not_found");
});

test("verifyOtpWith — correct code still works after a couple of wrong tries", async () => {
  const { store } = memOtpStore();
  const { sender, sent } = captureSender();
  await requestOtpWith(store, sender, { phone: PHONE, purpose: "verify" }, T0);
  const wrong = sent[0].code === "000000" ? "111111" : "000000";

  assert.equal(await verifyOtpWith(store, { phone: PHONE, purpose: "verify", otp: wrong }, T0 + 1000), "invalid");
  assert.equal(await verifyOtpWith(store, { phone: PHONE, purpose: "verify", otp: wrong }, T0 + 1000), "invalid");
  assert.equal(await verifyOtpWith(store, { phone: PHONE, purpose: "verify", otp: sent[0].code }, T0 + 1000), "ok");
});

test("requestOtpWith — rate-limited within 60s, allowed after", async () => {
  const { store } = memOtpStore();
  const { sender } = captureSender();

  const first = await requestOtpWith(store, sender, { phone: PHONE, purpose: "verify" }, T0);
  assert.equal(first.ok, true);

  // 30s later → blocked, with a retry hint.
  const tooSoon = await requestOtpWith(store, sender, { phone: PHONE, purpose: "verify" }, T0 + 30_000);
  assert.equal(tooSoon.ok, false);
  if (!tooSoon.ok) {
    assert.equal(tooSoon.reason, "rate_limited");
    assert.equal(tooSoon.retryAfterSec, 30);
  }

  // 61s later → allowed again.
  const later = await requestOtpWith(store, sender, { phone: PHONE, purpose: "verify" }, T0 + 61_000);
  assert.equal(later.ok, true);
});

test("requestOtpWith — send failure is reported, not thrown", async () => {
  const { store } = memOtpStore();
  const failing: OtpSender = async () => ({ ok: false, error: "boom" });
  const res = await requestOtpWith(store, failing, { phone: PHONE, purpose: "verify" }, T0);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.reason, "send_failed");
    assert.equal(res.error, "boom");
  }
});

/* ───────────────────────── Zalo ZNS mock-send ───────────────────────── */

test("toZaloPhone — VN local → 84-form (idempotent)", () => {
  assert.equal(toZaloPhone("0936336649"), "84936336649");
  assert.equal(toZaloPhone("84936336649"), "84936336649");
});

test("sendZnsOtp — mocks (logs + ok) when no creds in env", async () => {
  // Guard: the live creds must be absent for the mock path under test.
  assert.ok(
    !process.env.ZALO_OA_ACCESS_TOKEN && !process.env.ZALO_ZNS_TEMPLATE_ID,
    "ZNS env must be unset for the mock-path test"
  );

  const logs: string[] = [];
  const orig = console.log;
  console.log = (...a: unknown[]) => { logs.push(a.join(" ")); };
  try {
    const res = await sendZnsOtp(PHONE, "123456");
    assert.deepEqual(res, { ok: true, mocked: true });
  } finally {
    console.log = orig;
  }
  assert.ok(
    logs.some((l) => l.includes("[ZNS MOCK]") && l.includes("123456") && l.includes(PHONE)),
    "mock logs the OTP server-side"
  );
});

/* ───────────────────────── back-fill (TSK-155) ───────────────────────── */

type Bowl = { id: string; phone: string | null; profile_id: string | null };
type Order = { tran_id: string; phone: string | null; profile_id: string | null };

/**
 * In-memory BackfillStore over byo_bowls + ipos_orders rows. On verify it links
 * matching unlinked rows AND mints one stamp per persisted order not yet stamped
 * (modelling applyStamps' UNIQUE-ipos_tran_id idempotency).
 */
function memBackfill(opts: { bowls: Bowl[]; orders: Order[] }) {
  const { bowls, orders } = opts;
  const stamped = new Set<string>(); // tran_ids that already have a stamp_entry

  const store: BackfillStore = {
    async linkByoBowlsByPhone(phone, profileId) {
      let n = 0;
      for (const b of bowls) {
        if (b.phone === phone && b.profile_id == null) {
          b.profile_id = profileId;
          n++;
        }
      }
      return n;
    },
    async linkIposOrdersByPhone(phone, profileId) {
      let n = 0;
      for (const o of orders) {
        if (o.phone === phone && o.profile_id == null) {
          o.profile_id = profileId;
          n++;
        }
      }
      return n;
    },
    async backfillStampsFromIposOrders(phone) {
      let n = 0;
      for (const o of orders) {
        if (o.phone === phone && !stamped.has(o.tran_id)) {
          stamped.add(o.tran_id);
          n++;
        }
      }
      return n;
    },
  };
  return { store, bowls, orders, stamped };
}

test("backfillForVerifiedPhone — links bowls + orders and mints stamps, idempotent on re-run", async () => {
  const { store, bowls, orders } = memBackfill({
    bowls: [
      { id: "b1", phone: PHONE, profile_id: null }, // match → link
      { id: "b2", phone: PHONE, profile_id: null }, // match → link
      { id: "b3", phone: PHONE, profile_id: "other" }, // already linked → skip
      { id: "b4", phone: "0900000001", profile_id: null }, // other phone → skip
      { id: "b5", phone: null, profile_id: null }, // anonymous → skip
    ],
    orders: [
      { tran_id: "o1", phone: PHONE, profile_id: null }, // match → link + stamp
      { tran_id: "o2", phone: PHONE, profile_id: null }, // match → link + stamp
      { tran_id: "o3", phone: PHONE, profile_id: null }, // match → link + stamp
      { tran_id: "o4", phone: "0900000001", profile_id: null }, // other phone → skip
    ],
  });

  const first = await backfillForVerifiedPhone(store, PHONE, "me");
  assert.equal(first.byoBowlsLinked, 2, "two phone-only bowls linked");
  assert.equal(first.iposOrdersLinked, 3, "three persisted orders linked");
  assert.equal(first.stampsBackfilled, 3, "one stamp minted per persisted order");
  assert.equal(bowls.find((b) => b.id === "b1")!.profile_id, "me");
  assert.equal(bowls.find((b) => b.id === "b3")!.profile_id, "other", "existing link untouched");
  assert.equal(orders.find((o) => o.tran_id === "o4")!.profile_id, null, "other phone untouched");

  const second = await backfillForVerifiedPhone(store, PHONE, "me");
  assert.equal(second.byoBowlsLinked, 0, "re-verify links no new bowls");
  assert.equal(second.iposOrdersLinked, 0, "re-verify links no new orders");
  assert.equal(second.stampsBackfilled, 0, "re-verify mints no new stamps (idempotent)");
});
