/**
 * TSK-173 PR2 — "Lá" chatbot goal filter (Layer A ranking).
 *
 * Covers high-protein + low-calorie ranking, dropping items that lack the
 * relevant macro, deterministic tie-breaking, the limit, and empty input.
 *
 * Run: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { filterByGoal, type MenuItem } from "@/lib/chatbot/goalFilter";

function mi(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: "i-" + Math.random().toString(36).slice(2),
    name_en: "Item",
    name_vn: null,
    category: "Premium",
    calories: 100,
    protein_g: 10,
    ...overrides,
  };
}

test("protein goal ranks by protein_g desc and drops items with no protein", () => {
  const items = [
    mi({ id: "low", name_en: "Low", protein_g: 5 }),
    mi({ id: "high", name_en: "High", protein_g: 30 }),
    mi({ id: "mid", name_en: "Mid", protein_g: 15 }),
    mi({ id: "none", name_en: "None", protein_g: null }),
  ];
  const out = filterByGoal(items, "protein");
  assert.deepEqual(out.map((i) => i.id), ["high", "mid", "low"]);
});

test("lowcal goal ranks by calories asc and drops items with no calories", () => {
  const items = [
    mi({ id: "big", name_en: "Big", calories: 600 }),
    mi({ id: "small", name_en: "Small", calories: 120 }),
    mi({ id: "mid", name_en: "Mid", calories: 300 }),
    mi({ id: "none", name_en: "None", calories: null }),
  ];
  const out = filterByGoal(items, "lowcal");
  assert.deepEqual(out.map((i) => i.id), ["small", "mid", "big"]);
});

test("ties break by name for a deterministic order", () => {
  const items = [
    mi({ id: "b", name_en: "Beta", protein_g: 20 }),
    mi({ id: "a", name_en: "Alpha", protein_g: 20 }),
  ];
  const out = filterByGoal(items, "protein");
  assert.deepEqual(out.map((i) => i.name_en), ["Alpha", "Beta"]);
});

test("respects the limit", () => {
  const items = [
    mi({ id: "a", protein_g: 50 }),
    mi({ id: "b", protein_g: 40 }),
    mi({ id: "c", protein_g: 30 }),
  ];
  assert.equal(filterByGoal(items, "protein", 2).length, 2);
});

test("empty input → empty list", () => {
  assert.deepEqual(filterByGoal([], "protein"), []);
  assert.deepEqual(filterByGoal([], "lowcal"), []);
});
