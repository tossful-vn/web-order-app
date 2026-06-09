/**
 * TSK-148 — iPOS EOD → Magic Stamp sync.
 *
 * Covers: phone normalization table, parser filtering / store mapping, and
 * applyStamps idempotency (same file twice = same stamp count) + card rollover.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { STAMPS_REQUIRED } from "@/lib/types/loyalty";
import { normalizeIposPhone } from "@/lib/ipos/normalizePhone";
import { parseEodOrders, IPOS_STORE_UIDS, type ParsedOrder } from "@/lib/ipos/parseEodOrders";
import {
  applyStamps,
  type StampStore,
  type CardRow,
  type VerifiedAccount,
} from "@/lib/ipos/applyStamps";

const HN_STORE_ID = "store-hn-uuid";

/* ───────────────────────── phone normalization ───────────────────────── */

test("normalizeIposPhone — table", () => {
  const cases: Array<[string | null | undefined, string | null]> = [
    // 84-prefixed VN mobiles → 0 + last 9
    ["84936336649", "0936336649"],
    ["84 936 336 649", "0936336649"], // non-digits stripped
    ["84-987.654-321", "0987654321"],
    ["84512345678", "0512345678"], // leader 5 is a valid mobile
    ["84712345678", "0712345678"], // leader 7
    ["84812345678", "0812345678"], // leader 8
    ["84312345678", "0312345678"], // leader 3
    // already VN local form → kept
    ["0936336649", "0936336649"],
    // GrabFood / online hub placeholders → excluded
    ["8410000232", null],
    ["84100000000", null],
    ["84100232", null],
    // landline-style leader (2/6 etc. not a mobile) → excluded
    ["84236789012", null],
    ["84612345678", null],
    // blanks / too short / junk → excluded
    ["", null],
    [null, null],
    [undefined, null],
    ["8493633", null],
    ["abc", null],
    ["849363366490000", null], // too long
  ];
  for (const [input, expected] of cases) {
    assert.equal(normalizeIposPhone(input), expected, `input=${JSON.stringify(input)}`);
  }
});

/* ───────────────────────── parser filtering ───────────────────────── */

function order(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tran_id: "T-" + Math.random().toString(36).slice(2),
    tran_no: "1001",
    store_uid: IPOS_STORE_UIDS.HN,
    tran_date: 1780234832126,
    extra_data: { customer_phone: "84936336649", customer_name: "Test" },
    ...overrides,
  };
}

test("parseEodOrders — keeps only attributable orders, maps store_uid → store_id", () => {
  const raw = [
    order({ tran_id: "A", extra_data: { customer_phone: "84936336649" } }), // ✓
    order({ tran_id: "B", extra_data: { customer_phone: "8410000232" } }), // ✗ placeholder
    order({ tran_id: "C", extra_data: { customer_phone: "" } }), // ✗ blank
    order({ tran_id: "D", extra_data: {} }), // ✗ no phone
    order({ tran_id: "E", store_uid: IPOS_STORE_UIDS.HCM }), // ✗ wrong store
    order({ tran_id: "", extra_data: { customer_phone: "84936336649" } }), // ✗ no tran_id
    order({ tran_id: "A", extra_data: { customer_phone: "84936336649" } }), // ✗ dup of A
  ];

  const { orders, stats } = parseEodOrders(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);

  assert.equal(stats.read, 7);
  assert.equal(stats.attributable, 1);
  assert.equal(stats.droppedNoPhone, 3); // B placeholder + C blank + D missing
  assert.equal(stats.droppedWrongStore, 1);
  assert.equal(stats.droppedNoTranId, 1);
  assert.equal(stats.duplicateTranIds, 1);

  assert.equal(orders.length, 1);
  assert.equal(orders[0].tran_id, "A");
  assert.equal(orders[0].store_id, HN_STORE_ID);
  assert.equal(orders[0].phone, "0936336649");
  assert.equal(orders[0].tran_date, 1780234832126);
});

test("parseEodOrders — placeholder/blank/empty all count as no-phone", () => {
  const raw = [
    order({ tran_id: "B", extra_data: { customer_phone: "8410000232" } }),
    order({ tran_id: "C", extra_data: { customer_phone: "" } }),
    order({ tran_id: "D", extra_data: {} }),
  ];
  const { orders, stats } = parseEodOrders(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);
  assert.equal(orders.length, 0);
  assert.equal(stats.droppedNoPhone, 3);
});

test("parseEodOrders — handles envelope + stringified extra_data", () => {
  const raw = {
    data: [
      order({ tran_id: "A", extra_data: JSON.stringify({ customer_phone: "84936336649" }) }),
    ],
  };
  const { orders, stats } = parseEodOrders(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);
  assert.equal(stats.attributable, 1);
  assert.equal(orders[0].phone, "0936336649");
});

/* ─────────────── applyStamps — eligibility + idempotency ─────────────── */

type MemCard = CardRow & { user_id: string };

/**
 * In-memory StampStore. `accounts` maps a verified phone → its account
 * (userId + signupAt epoch ms). A phone absent from the map has no web account.
 */
function memStore(accounts: Record<string, VerifiedAccount> = {}) {
  const cards: MemCard[] = [];
  const entries: Array<{ card_id: string; ipos_tran_id: string; stamp_number: number }> = [];
  let seq = 0;

  const store: StampStore = {
    async findVerifiedAccountByPhone(phone) {
      return accounts[phone] ?? null;
    },
    async hasEntryForTranId(tranId) {
      return entries.some((e) => e.ipos_tran_id === tranId);
    },
    async findCollectingCard(userId) {
      const matches = cards.filter(
        (c) =>
          c.user_id === userId &&
          c.reward_status === "collecting" &&
          c.stamps_collected < STAMPS_REQUIRED,
      );
      const c = matches[matches.length - 1];
      return c ? { id: c.id, stamps_collected: c.stamps_collected, reward_status: c.reward_status } : null;
    },
    async createCard(userId) {
      const c: MemCard = {
        id: `card-${++seq}`,
        user_id: userId,
        stamps_collected: 0,
        reward_status: "collecting",
      };
      cards.push(c);
      return { id: c.id, stamps_collected: 0, reward_status: "collecting" };
    },
    async insertEntry(entry) {
      if (entries.some((e) => e.ipos_tran_id === entry.ipos_tran_id)) {
        return { ok: false, duplicate: true };
      }
      entries.push({
        card_id: entry.card_id,
        ipos_tran_id: entry.ipos_tran_id,
        stamp_number: entry.stamp_number,
      });
      return { ok: true };
    },
    async updateCardProgress(cardId, stampsCollected, full) {
      const c = cards.find((x) => x.id === cardId)!;
      c.stamps_collected = stampsCollected;
      if (full) c.reward_status = "reward_ready";
    },
  };

  return { store, cards, entries };
}

const REG = "0936336649"; // registered + verified, signed up at t=100
const acct = (signupAt: number): VerifiedAccount => ({ userId: "user-123", signupAt });
function ord(tran_id: string, phone: string, tran_date: number): ParsedOrder {
  return { tran_id, tran_no: tran_id, store_id: HN_STORE_ID, phone, tran_date };
}

test("applyStamps — stamps only registered+verified, post-signup orders", async () => {
  const { store, entries, cards } = memStore({ [REG]: acct(100) });
  const orders = [
    ord("o1", REG, 150), // ✓ post-signup
    ord("o2", REG, 200), // ✓ post-signup
    ord("o3", REG, 50), // ✗ pre-signup
    ord("o4", "0900000001", 300), // ✗ no web account
  ];
  const s = await applyStamps(store, orders);
  assert.equal(s.inserted, 2);
  assert.equal(entries.length, 2);
  assert.equal(s.skippedPreSignup, 1);
  assert.equal(s.skippedNoAccount, 1);
  assert.equal(s.newCards, 1); // one customer → one card
  assert.equal(cards[0].user_id, "user-123");
});

test("applyStamps — idempotent: same file twice = same stamp count", async () => {
  const { store, entries } = memStore({ [REG]: acct(100) });
  const orders = [ord("o1", REG, 150), ord("o2", REG, 200), ord("o3", "0900000001", 300)];

  const first = await applyStamps(store, orders);
  assert.equal(first.inserted, 2);
  const countAfterFirst = entries.length;

  const second = await applyStamps(store, orders);
  assert.equal(second.inserted, 0);
  assert.equal(second.skippedExisting, 2);
  assert.equal(second.newCards, 0);
  assert.equal(entries.length, countAfterFirst, "re-import must not add entries");
});

test("applyStamps — heavy customer rolls over at STAMPS_REQUIRED (no redemption)", async () => {
  const { store, cards, entries } = memStore({ [REG]: acct(0) });
  const n = STAMPS_REQUIRED + 2; // fill one card + start the next
  const orders = Array.from({ length: n }, (_, i) => ord(`o${i}`, REG, i + 1));
  const s = await applyStamps(store, orders);

  assert.equal(s.inserted, n);
  assert.equal(entries.length, n);
  assert.equal(cards.length, 2, `${n} stamps → two cards (${STAMPS_REQUIRED} + 2)`);
  assert.equal(cards[0].stamps_collected, STAMPS_REQUIRED);
  assert.equal(cards[0].reward_status, "reward_ready"); // ready, never redeemed
  assert.equal(cards[1].stamps_collected, 2);
  assert.equal(cards[1].reward_status, "collecting");
});

test("applyStamps — unregistered phone earns nothing", async () => {
  const { store, entries, cards } = memStore(); // no accounts
  const s = await applyStamps(store, [ord("o1", REG, 150), ord("o2", "0900000001", 200)]);
  assert.equal(s.inserted, 0);
  assert.equal(s.skippedNoAccount, 2);
  assert.equal(entries.length, 0);
  assert.equal(cards.length, 0);
});
