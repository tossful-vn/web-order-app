/**
 * TSK-151, Part 1 — protected iPOS import endpoint.
 *
 * Covers: route auth (401 without / with the wrong secret; 503 when unconfigured),
 * the orchestration happy path on a small C03 fixture (orders + stamps + BYO in
 * one pass), and idempotency (running the same import twice inserts nothing new).
 *
 * The orchestrator (`runIposImport`) is exercised against in-memory fakes of the
 * existing apply-stores, so these tests need no DB. The route's auth guard is
 * tested directly since it short-circuits before any DB client is built.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { IPOS_STORE_UIDS } from "@/lib/ipos/parseEodOrders";
import type { StampStore, CardRow, VerifiedAccount } from "@/lib/ipos/applyStamps";
import type { IposOrderStore, NewIposOrder } from "@/lib/ipos/applyIposOrders";
import type { ByoStore, NewBowl, NewIngredient } from "@/lib/ipos/applyByoBowls";
import type { OrderItemStore, NewOrderItem } from "@/lib/ipos/applyOrderItems";
import { STAMPS_REQUIRED } from "@/lib/types/loyalty";
import {
  runIposImport,
  type ImportStores,
  type IposStoreKey,
} from "@/lib/ipos/importEod";
import { POST } from "@/app/api/ipos/import/route";

const STORE_ID = "store-hn-uuid";
const STORE_CODE = "CH1";
const PHONE_RAW = "84936336649";
const PHONE = "0936336649";
const T = 1780234832126; // a real epoch ms

/* ───────────────────────── C03 fixture ───────────────────────── */

/** One C03 order with a single BYO bowl (one real ingredient + one modifier). */
function c03Order(tranId: string, lineId: string): Record<string, unknown> {
  return {
    tran_id: tranId,
    tran_no: `INV-${tranId}`,
    store_uid: IPOS_STORE_UIDS.HN,
    tran_date: T,
    extra_data: { customer_phone: PHONE_RAW },
    sale_detail: [
      {
        id: lineId,
        item_name: "Build-Your-Own",
        item_type_name: "TỰ CHỌN | BUILD YOUR OWN",
        toppings: [
          { item_id: "ITEM-BASE_001", item_name: "Cơm | Rice", quantity: 1 },
          { item_id: "SERVICE_801", item_name: "Không dao dĩa | No Cutlery", quantity: 1 },
        ],
      },
    ],
  };
}

const FIXTURE = [c03Order("A", "L1"), c03Order("B", "L2")];

/* ───────────────────── in-memory ImportStores ───────────────────── */

/**
 * In-memory fakes of the three apply-stores + a fixed store resolver, mirroring
 * the live adapters' contracts (idempotency hits return { duplicate: true }).
 * `verifiedAt` makes the fixture phone a phone_verified account that earns.
 */
function memImportStores(verifiedAt: number | null = 0) {
  // stamp store
  const cards: Array<CardRow & { user_id: string }> = [];
  const entries: Array<{ ipos_tran_id: string }> = [];
  let cardSeq = 0;
  // order store
  const orders: NewIposOrder[] = [];
  // byo store
  const bowls: NewBowl[] = [];
  const ingredients: NewIngredient[] = [];
  let bowlSeq = 0;
  // order-items store
  const items: NewOrderItem[] = [];

  const stampStore: StampStore = {
    async findVerifiedAccountByPhone(phone): Promise<VerifiedAccount | null> {
      if (phone === PHONE && verifiedAt !== null) return { userId: "user-1", verifiedAt };
      return null;
    },
    async hasEntryForTranId(tranId) {
      return entries.some((e) => e.ipos_tran_id === tranId);
    },
    async findCollectingCard(userId) {
      const open = cards.filter(
        (c) => c.user_id === userId && c.reward_status === "collecting" && c.stamps_collected < STAMPS_REQUIRED,
      );
      const c = open[open.length - 1];
      return c ? { id: c.id, stamps_collected: c.stamps_collected, reward_status: c.reward_status } : null;
    },
    async createCard(userId) {
      const c = { id: `card-${++cardSeq}`, user_id: userId, stamps_collected: 0, reward_status: "collecting" };
      cards.push(c);
      return { id: c.id, stamps_collected: 0, reward_status: "collecting" };
    },
    async insertEntry(entry) {
      if (entries.some((e) => e.ipos_tran_id === entry.ipos_tran_id)) {
        return { ok: false, duplicate: true };
      }
      entries.push({ ipos_tran_id: entry.ipos_tran_id });
      return { ok: true };
    },
    async updateCardProgress(cardId, stampsCollected, full) {
      const c = cards.find((x) => x.id === cardId)!;
      c.stamps_collected = stampsCollected;
      if (full) c.reward_status = "reward_ready";
    },
  };

  const orderStore: IposOrderStore = {
    async findVerifiedProfileIdByPhone(phone) {
      return phone === PHONE && verifiedAt !== null ? "user-1" : null;
    },
    async insertOrder(order) {
      if (orders.some((o) => o.ipos_tran_id === order.ipos_tran_id)) {
        return { ok: false, duplicate: true };
      }
      orders.push(order);
      return { ok: true };
    },
  };

  const byoStore: ByoStore = {
    async findProfileIdByPhone(phone) {
      return phone === PHONE && verifiedAt !== null ? "user-1" : null;
    },
    async hasBowlForLineId(lineId) {
      return bowls.some((b) => b.ipos_line_id === lineId);
    },
    async insertBowl(bowl) {
      if (bowls.some((b) => b.ipos_line_id === bowl.ipos_line_id)) {
        return { ok: false, duplicate: true };
      }
      bowls.push(bowl);
      return { ok: true, bowlId: `bowl-${++bowlSeq}` };
    },
    async insertIngredients(rows) {
      ingredients.push(...rows);
    },
  };

  const itemStore: OrderItemStore = {
    async findProfileIdByPhone(phone) {
      return phone === PHONE && verifiedAt !== null ? "user-1" : null;
    },
    async hasItemForLineId(lineId) {
      return items.some((i) => i.ipos_line_id === lineId);
    },
    async insertItem(item) {
      if (items.some((i) => i.ipos_line_id === item.ipos_line_id)) {
        return { ok: false, duplicate: true };
      }
      items.push(item);
      return { ok: true };
    },
  };

  const stores: ImportStores = {
    async resolveStoreId(code) {
      return code === STORE_CODE ? STORE_ID : null;
    },
    orderStore,
    stampStore,
    byoStore,
    itemStore,
  };

  return { stores, cards, entries, orders, bowls, ingredients, items };
}

/* ───────────────────────── orchestration ───────────────────────── */

test("runIposImport — happy path: orders + stamps + BYO in one pass", async () => {
  const mem = memImportStores(0); // phone verified at t=0 → both orders earn
  const summary = await runIposImport(mem.stores, "HN" as IposStoreKey, FIXTURE);

  assert.equal(summary.store, "HN");
  assert.equal(summary.orders_read, 2);
  assert.equal(summary.attributable, 2);
  assert.equal(summary.orders_persisted, 2);
  assert.equal(summary.stamps_inserted, 2);
  assert.equal(summary.new_cards, 1);
  assert.equal(summary.byo_bowls, 2);
  assert.equal(summary.byo_ingredients, 4); // 2 toppings × 2 bowls
  assert.equal(summary.modifiers_flagged, 2); // one SERVICE_ line per bowl
  assert.equal(summary.order_items, 2); // one sale_detail line per order
  assert.equal(summary.order_items_products, 2); // both are real (non-modifier) lines

  assert.equal(mem.entries.length, 2);
  assert.equal(mem.orders.length, 2);
  assert.equal(mem.bowls.length, 2);
  assert.equal(mem.ingredients.length, 4);
  assert.equal(mem.items.length, 2);
});

test("runIposImport — idempotent: POST twice = same counts, no dupes", async () => {
  const mem = memImportStores(0);

  const first = await runIposImport(mem.stores, "HN" as IposStoreKey, FIXTURE);
  assert.equal(first.stamps_inserted, 2);
  assert.equal(first.orders_persisted, 2);
  assert.equal(first.byo_bowls, 2);
  assert.equal(first.order_items, 2);

  const second = await runIposImport(mem.stores, "HN" as IposStoreKey, FIXTURE);
  assert.equal(second.stamps_inserted, 0, "no new stamps on re-import");
  assert.equal(second.orders_persisted, 0, "no new orders on re-import");
  assert.equal(second.byo_bowls, 0, "no new bowls on re-import");
  assert.equal(second.order_items, 0, "no new items on re-import");
  assert.equal(second.skipped.stamps_existing, 2);
  assert.equal(second.skipped.orders_existing, 2);
  assert.equal(second.skipped.byo_existing, 2);
  assert.equal(second.skipped.items_existing, 2);

  // The store contents are unchanged after the second run.
  assert.equal(mem.entries.length, 2);
  assert.equal(mem.orders.length, 2);
  assert.equal(mem.bowls.length, 2);
  assert.equal(mem.ingredients.length, 4);
  assert.equal(mem.items.length, 2);
});

test("runIposImport — unknown store code surfaces StoreNotFoundError", async () => {
  const mem = memImportStores(0);
  mem.stores.resolveStoreId = async () => null;
  await assert.rejects(
    () => runIposImport(mem.stores, "HN" as IposStoreKey, FIXTURE),
    /could not resolve store code/,
  );
});

/* ───────────────────────── route auth ───────────────────────── */

const ENDPOINT = "http://localhost/api/ipos/import";

function importRequest(headers: Record<string, string>, body: unknown): Request {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("POST /api/ipos/import — 401 without an Authorization header", async () => {
  process.env.EOD_IMPORT_SECRET = "test-secret";
  const res = await POST(importRequest({}, { store: "HN", orders: FIXTURE }));
  assert.equal(res.status, 401);
});

test("POST /api/ipos/import — 401 with the wrong secret", async () => {
  process.env.EOD_IMPORT_SECRET = "test-secret";
  const res = await POST(
    importRequest({ authorization: "Bearer wrong-secret" }, { store: "HN", orders: FIXTURE }),
  );
  assert.equal(res.status, 401);
});

test("POST /api/ipos/import — 503 when the server secret is unset", async () => {
  delete process.env.EOD_IMPORT_SECRET;
  const res = await POST(
    importRequest({ authorization: "Bearer anything" }, { store: "HN", orders: FIXTURE }),
  );
  assert.equal(res.status, 503);
});

test("POST /api/ipos/import — 400 on a bad store with a valid secret", async () => {
  process.env.EOD_IMPORT_SECRET = "test-secret";
  const res = await POST(
    importRequest({ authorization: "Bearer test-secret" }, { store: "NYC", orders: FIXTURE }),
  );
  assert.equal(res.status, 400);
});
