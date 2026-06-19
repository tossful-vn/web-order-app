/**
 * TSK-173 PR2 — "Lá" chatbot Layer B content guarantees.
 *
 * These tests defend the hard spec rules that can't be eyeballed at review time:
 *   §1  every piece of copy is bilingual (vi + en), non-empty.
 *   §2  NO recipe / proportion / technique data anywhere in the static content.
 *   §2  the allergen question redirects to staff (no allergen Q&A).
 *   + the stamp FAQ states the real 9 → free-10th rule.
 *
 * Run: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ONBOARDING_CARDS,
  FAQ_ENTRIES,
  ALLERGEN_REDIRECT,
  pick,
  type I18n,
} from "@/lib/chatbot/content";

/** Every translatable string in the content module. */
function allStrings(): I18n[] {
  const out: I18n[] = [];
  for (const c of ONBOARDING_CARDS) {
    out.push(c.title, c.body);
    if (c.cta) out.push(c.cta);
  }
  for (const f of FAQ_ENTRIES) {
    out.push(f.q, f.a);
    if (f.cta) out.push(f.cta);
  }
  return out;
}

test("pick() returns the language-specific string", () => {
  const s: I18n = { vi: "xin chào", en: "hello" };
  assert.equal(pick(s, "vi"), "xin chào");
  assert.equal(pick(s, "en"), "hello");
});

test("all content is bilingual and non-empty", () => {
  for (const s of allStrings()) {
    assert.ok(s.vi.trim().length > 0, `vi missing: ${JSON.stringify(s)}`);
    assert.ok(s.en.trim().length > 0, `en missing: ${JSON.stringify(s)}`);
  }
});

test("no recipe / proportion / technique data in static content (spec §2)", () => {
  // Recipe/technique/proportion vocabulary, vi + en. A best-seller or feature
  // guide must never teach how a bowl is made or its gram ratios.
  const banned =
    /\b(recipe|công thức|tỉ lệ|tỷ lệ|ratio|proportion|gram\b|grams\b|technique|kỹ thuật|cách làm|công đoạn|nướng|xào|hấp|marinade|ướp)\b/i;
  // Gram-amount proportions like "150g" / "30 g".
  const gramAmount = /\d+\s?g\b/;
  for (const s of allStrings()) {
    for (const v of [s.vi, s.en]) {
      assert.ok(!banned.test(v), `recipe/technique term leaked: "${v}"`);
      assert.ok(!gramAmount.test(v), `gram proportion leaked: "${v}"`);
    }
  }
});

test("the allergen question redirects to staff — no allergen Q&A (spec §2)", () => {
  const allergen = FAQ_ENTRIES.find((f) => f.key === "allergen");
  assert.ok(allergen, "an allergen FAQ entry exists");
  assert.deepEqual(allergen!.a, ALLERGEN_REDIRECT);
  // The redirect points to staff, in both languages.
  assert.match(ALLERGEN_REDIRECT.vi, /nhân viên/);
  assert.match(ALLERGEN_REDIRECT.en, /staff/i);
});

test("onboarding covers the five named features", () => {
  const keys = ONBOARDING_CARDS.map((c) => c.key).sort();
  assert.deepEqual(keys, ["byo", "pickup", "saved", "stamp", "week"]);
});

test("stamp FAQ states the real 9 → free-10th rule", () => {
  const stamp = FAQ_ENTRIES.find((f) => f.key === "stamp");
  assert.ok(stamp, "a stamp FAQ entry exists");
  assert.match(stamp!.a.vi, /9/);
  assert.match(stamp!.a.vi, /10/);
  assert.match(stamp!.a.en, /9/);
  assert.match(stamp!.a.en, /10/);
});

test("FAQ keys are unique", () => {
  const keys = FAQ_ENTRIES.map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length);
});
