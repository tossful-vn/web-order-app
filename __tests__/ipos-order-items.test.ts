/**
 * TSK-172 — iPOS order-items capture.
 *
 * Covers: capturing EVERY sale_detail line (signature / menu / BYO, not just
 * BUILD YOUR OWN), modifier flagging via the SERVICE_ class (not by name), store
 * mapping, phone normalisation reuse, undated flagging, no-id drop, and
 * applyOrderItems insert / idempotency / verified-profile-linking / undated-skip.
 *
 * Mirrors byo-archive.test.ts but for the flat one-row-per-line item table.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseOrderItems,
  IPOS_STORE_UIDS,
  type OrderItem,
} from "@/lib/ipos/parseOrderItems";
import {
  applyOrderItems,
  type OrderItemStore,
  type NewOrderItem,
} from "@/lib/ipos/applyOrderItems";

const HN_STORE_ID = "store-hn-uuid";
const TS = 1780234832126; // a real epoch ms

/* ── fixture builders mirroring the real C03 JSON shape ── */

const NO_CUTLERY = {
  id: "mod-1",
  item_id: "SERVICE_801",
  item_name: "Không dao dĩa | No Cutlery",
  item_type_name: "DỊCH VỤ | SERVICE",
  quantity: 1,
};

function line(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    item_id: "ITEM-SIG_004",
    item_name: "Signature Kale Bowl",
    item_type_name: "MÓN CHÍNH | SIGNATURE",
    quantity: 1,
    ...overrides,
  };
}

function order(overrides: Record<string, unknown> = {}) {
  return {
    tran_id: "T-" + Math.random().toString(36).slice(2),
    store_uid: IPOS_STORE_UIDS.HN,
    tran_date: TS,
    extra_data: { customer_phone: "84936336649" },
    sale_detail: [],
    ...overrides,
  };
}

/* ───────────────────────── parsing ───────────────────────── */

test("parseOrderItems — captures EVERY line type, not just BUILD YOUR OWN", () => {
  const raw = [
    order({
      tran_id: "ORD-1",
      sale_detail: [
        line("l-sig", { item_id: "ITEM-SIG_004", item_name: "Signature Bowl", item_type_name: "SIGNATURE" }),
        line("l-byo", { item_id: "ITEM-BYO_001", item_name: "Build-Your-Own", item_type_name: "TỰ CHỌN | BUILD YOUR OWN" }),
        line("l-drink", { item_id: "ITEM-DRK_002", item_name: "Kombucha", item_type_name: "ĐỒ UỐNG | DRINK" }),
      ],
    }),
  ];

  const { items, stats } = parseOrderItems(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);

  assert.equal(stats.itemsParsed, 3, "all three lines captured regardless of type");
  assert.equal(stats.linesFound, 3);
  const ids = items.map((i) => i.ipos_line_id).sort();
  assert.deepEqual(ids, ["l-byo", "l-drink", "l-sig"]);
  const sig = items.find((i) => i.ipos_line_id === "l-sig")!;
  assert.equal(sig.ipos_tran_id, "ORD-1");
  assert.equal(sig.item_id, "ITEM-SIG_004");
  assert.equal(sig.item_name, "Signature Bowl");
  assert.equal(sig.item_type_name, "SIGNATURE");
  assert.equal(sig.store_id, HN_STORE_ID);
});

test("parseOrderItems — modifiers flagged via SERVICE_ class, real items are not", () => {
  const raw = [
    order({
      tran_id: "ORD-2",
      sale_detail: [
        line("l-real", { item_id: "ITEM-SIG_004" }),
        NO_CUTLERY, // SERVICE_801
      ],
    }),
  ];

  const { items, stats } = parseOrderItems(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);

  const real = items.find((i) => i.item_id === "ITEM-SIG_004")!;
  const cutlery = items.find((i) => i.item_id === "SERVICE_801")!;
  assert.equal(real.is_modifier, false, "real menu item is not a modifier");
  assert.equal(cutlery.is_modifier, true, "Không dao dĩa flagged by class, not name");

  assert.equal(stats.realLines, 1);
  assert.equal(stats.modifierLines, 1);
  assert.deepEqual(stats.modifierItemIds, ["SERVICE_801"]);
});

test("parseOrderItems — preserves quantity, keys on item_id, defaults item_name", () => {
  const raw = [
    order({
      tran_id: "ORD-3",
      sale_detail: [
        line("l-q", { item_id: "ITEM-PROT_009", item_name: "", quantity: 3 }),
      ],
    }),
  ];
  const { items } = parseOrderItems(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);
  const it = items[0];
  assert.equal(it.item_id, "ITEM-PROT_009");
  assert.equal(it.quantity, 3);
  assert.equal(it.item_name, "(unknown)", "blank item_name falls back to (unknown)");
});

test("parseOrderItems — reuses TSK-148 normalizer + store map; keeps phoneless items", () => {
  const raw = [
    order({ tran_id: "P1", extra_data: { customer_phone: "84936336649" }, sale_detail: [line("l1")] }),
    order({ tran_id: "P2", extra_data: { customer_phone: "8410000232" }, sale_detail: [line("l2")] }), // placeholder → null
    order({ tran_id: "P3", extra_data: {}, sale_detail: [line("l3")] }), // no phone → null
    order({ tran_id: "WS", store_uid: IPOS_STORE_UIDS.HCM, sale_detail: [line("l4")] }), // wrong store
  ];
  const { items, stats } = parseOrderItems(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);

  assert.equal(stats.droppedWrongStore, 1, "HCM file content dropped from an HN import");
  assert.equal(items.length, 3);
  assert.equal(items.find((i) => i.ipos_line_id === "l1")!.phone, "0936336649"); // 84 → 0
  assert.equal(items.find((i) => i.ipos_line_id === "l2")!.phone, null); // placeholder
  assert.equal(items.find((i) => i.ipos_line_id === "l3")!.phone, null); // blank
  assert.equal(stats.attributable, 1);
  assert.equal(stats.phoneless, 2);
  items.forEach((i) => assert.equal(i.store_id, HN_STORE_ID));
});

test("parseOrderItems — undated order flags items (ordered_at null)", () => {
  const raw = [order({ tran_id: "ND", tran_date: null, sale_detail: [line("l-nd")] })];
  const { items, stats } = parseOrderItems(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);
  assert.equal(items.length, 1);
  assert.equal(items[0].ordered_at, null);
  assert.equal(stats.undated, 1);
});

test("parseOrderItems — line with no id is dropped", () => {
  const raw = [order({ tran_id: "ORD-X", sale_detail: [line("")] })];
  const { items, stats } = parseOrderItems(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);
  assert.equal(items.length, 0);
  assert.equal(stats.linesFound, 1);
  assert.equal(stats.droppedNoLineId, 1);
});

/* ─────────────── applyOrderItems — insert + idempotency ─────────────── */

/** In-memory OrderItemStore. `profiles` maps a phone → profile id. */
function memStore(profiles: Record<string, string> = {}) {
  const rows: NewOrderItem[] = [];

  const store: OrderItemStore = {
    async findProfileIdByPhone(phone) {
      return profiles[phone] ?? null;
    },
    async hasItemForLineId(lineId) {
      return rows.some((r) => r.ipos_line_id === lineId);
    },
    async insertItem(item) {
      if (rows.some((r) => r.ipos_line_id === item.ipos_line_id)) {
        return { ok: false, duplicate: true };
      }
      rows.push(item);
      return { ok: true };
    },
  };
  return { store, rows };
}

function item(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    ipos_tran_id: "ORD-1",
    ipos_line_id: "line-" + Math.random().toString(36).slice(2),
    store_id: HN_STORE_ID,
    phone: "0936336649",
    ordered_at: new Date(TS).toISOString(),
    item_id: "ITEM-SIG_004",
    item_name: "Signature Bowl",
    item_type_name: "SIGNATURE",
    quantity: 1,
    is_modifier: false,
    ...overrides,
  };
}

test("applyOrderItems — links to profile when phone matches, keeps phone otherwise", async () => {
  const { store, rows } = memStore({ "0936336649": "profile-abc" });
  const items = [
    item({ ipos_line_id: "L1", phone: "0936336649" }), // matched → linked
    item({ ipos_line_id: "L2", phone: "0900000001" }), // phone, no account → phone only
    item({ ipos_line_id: "L3", phone: null }), // anonymous
  ];
  const s = await applyOrderItems(store, items);

  assert.equal(s.inserted, 3);
  assert.equal(s.linkedToProfile, 1);
  assert.equal(s.phoneOnly, 1);
  assert.equal(s.anonymous, 1);

  const r1 = rows.find((r) => r.ipos_line_id === "L1")!;
  assert.equal(r1.profile_id, "profile-abc");
  assert.equal(r1.phone, "0936336649", "phone kept even when linked");

  const r2 = rows.find((r) => r.ipos_line_id === "L2")!;
  assert.equal(r2.profile_id, null);
  assert.equal(r2.phone, "0900000001", "phone kept when no account");
});

test("applyOrderItems — idempotent on ipos_line_id (same file twice = same rows)", async () => {
  const { store, rows } = memStore({ "0936336649": "profile-abc" });
  const items = [item({ ipos_line_id: "L1" }), item({ ipos_line_id: "L2" })];

  const first = await applyOrderItems(store, items);
  assert.equal(first.inserted, 2);
  const afterFirst = rows.length;

  const second = await applyOrderItems(store, items);
  assert.equal(second.inserted, 0);
  assert.equal(second.skippedExisting, 2);
  assert.equal(rows.length, afterFirst, "re-import adds no items");
});

test("applyOrderItems — undated items are skipped (ordered_at NOT NULL)", async () => {
  const { store, rows } = memStore();
  const s = await applyOrderItems(store, [item({ ipos_line_id: "L1", ordered_at: null })]);
  assert.equal(s.inserted, 0);
  assert.equal(s.skippedUndated, 1);
  assert.equal(rows.length, 0);
});
