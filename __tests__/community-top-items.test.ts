/**
 * TSK-173 PR1 — community best-sellers aggregation.
 *
 * Tests the reference aggregator (lib/recommend/communityTopItems.ts), which
 * mirrors the `community_top_items` SECURITY DEFINER SQL function exactly. Covers:
 * aggregation correctness, NO PII in the output, the store filter, the
 * modifier/no-id/window exclusions, ordering, limit, and empty-data fallback.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aggregateCommunityTopItems,
  type OrderItemRow,
} from "@/lib/recommend/communityTopItems";

const STORE_HN = "11111111-1111-1111-1111-111111111111";
const STORE_HCM = "22222222-2222-2222-2222-222222222222";

/** A recent timestamp well inside any default 30-day window. */
const NOW = Date.now();
const recent = (daysAgo = 1) =>
  new Date(NOW - daysAgo * 24 * 60 * 60 * 1000).toISOString();

function row(overrides: Partial<OrderItemRow> = {}): OrderItemRow {
  return {
    ipos_tran_id: "T-" + Math.random().toString(36).slice(2),
    store_id: STORE_HN,
    ordered_at: recent(1),
    item_id: "ITEM-SIG_004",
    item_name: "Signature Kale Bowl",
    item_type_name: "SIGNATURE",
    quantity: 1,
    is_modifier: false,
    phone: "0936336649",
    profile_id: "profile-abc",
    ...overrides,
  };
}

test("aggregates qty + distinct orders per item, ordered by total_qty desc", () => {
  const rows = [
    row({ ipos_tran_id: "O1", item_id: "A", item_name: "Bowl A", quantity: 2 }),
    row({ ipos_tran_id: "O2", item_id: "A", item_name: "Bowl A", quantity: 1 }),
    row({ ipos_tran_id: "O2", item_id: "A", item_name: "Bowl A", quantity: 1 }), // same order
    row({ ipos_tran_id: "O3", item_id: "B", item_name: "Bowl B", quantity: 10 }),
  ];
  const out = aggregateCommunityTopItems(rows, { since: new Date(0) });

  assert.equal(out.length, 2);
  // B has more qty → first.
  assert.equal(out[0].item_id, "B");
  assert.equal(out[0].total_qty, 10);
  assert.equal(out[0].order_count, 1);

  const a = out[1];
  assert.equal(a.item_id, "A");
  assert.equal(a.total_qty, 4, "2 + 1 + 1");
  assert.equal(a.order_count, 2, "O1 and O2 — duplicate line in O2 not double-counted");
});

test("output carries NO PII — only the five aggregate columns", () => {
  const out = aggregateCommunityTopItems([row({ item_id: "A" })], {
    since: new Date(0),
  });
  assert.equal(out.length, 1);
  assert.deepEqual(
    Object.keys(out[0]).sort(),
    ["item_id", "item_name", "item_type_name", "order_count", "total_qty"],
  );
  // Belt-and-braces: serialise and confirm no phone / profile leaks through.
  const json = JSON.stringify(out);
  assert.ok(!json.includes("phone"), "no phone key");
  assert.ok(!json.includes("profile"), "no profile_id key");
  assert.ok(!json.includes("0936336649"), "no phone value");
});

test("store filter restricts to one store; null = all stores", () => {
  const rows = [
    row({ item_id: "A", store_id: STORE_HN, quantity: 3 }),
    row({ item_id: "B", store_id: STORE_HCM, quantity: 5 }),
  ];

  const hn = aggregateCommunityTopItems(rows, { storeId: STORE_HN, since: new Date(0) });
  assert.deepEqual(hn.map((i) => i.item_id), ["A"]);

  const all = aggregateCommunityTopItems(rows, { since: new Date(0) });
  assert.deepEqual(all.map((i) => i.item_id).sort(), ["A", "B"]);
});

test("excludes service modifiers and rows with no item_id", () => {
  const rows = [
    row({ item_id: "A", quantity: 1 }),
    row({ item_id: "SERVICE_801", is_modifier: true, quantity: 99 }), // modifier
    row({ item_id: null, quantity: 99 }), // unattributable line
  ];
  const out = aggregateCommunityTopItems(rows, { since: new Date(0) });
  assert.deepEqual(out.map((i) => i.item_id), ["A"]);
});

test("excludes rows older than the since window", () => {
  const rows = [
    row({ item_id: "A", ordered_at: recent(2) }), // inside
    row({ item_id: "B", ordered_at: recent(60) }), // outside 30d
  ];
  const since = new Date(NOW - 30 * 24 * 60 * 60 * 1000);
  const out = aggregateCommunityTopItems(rows, { since });
  assert.deepEqual(out.map((i) => i.item_id), ["A"]);
});

test("respects the limit", () => {
  const rows = [
    row({ item_id: "A", quantity: 5 }),
    row({ item_id: "B", quantity: 4 }),
    row({ item_id: "C", quantity: 3 }),
  ];
  const out = aggregateCommunityTopItems(rows, { since: new Date(0), limit: 2 });
  assert.deepEqual(out.map((i) => i.item_id), ["A", "B"]);
});

test("empty data → empty list (fallback, no throw)", () => {
  assert.deepEqual(aggregateCommunityTopItems([], { since: new Date(0) }), []);
  // All rows filtered out also yields an empty list.
  const filtered = aggregateCommunityTopItems(
    [row({ is_modifier: true })],
    { since: new Date(0) },
  );
  assert.deepEqual(filtered, []);
});
