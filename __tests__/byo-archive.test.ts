/**
 * TSK-153, Part A — BYO preference archive.
 *
 * Covers: multi-BYO order splitting into N bowls (each with its own nested
 * ingredients), modifier flagging via the SERVICE_ class (not by name), store
 * mapping, phone normalisation reuse, quantity preservation, and applyByoBowls
 * idempotency / profile-linking.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseByoBowls,
  IPOS_STORE_UIDS,
  type ByoBowl,
} from "@/lib/ipos/parseByoBowls";
import {
  applyByoBowls,
  type ByoStore,
  type NewBowl,
  type NewIngredient,
} from "@/lib/ipos/applyByoBowls";

const HN_STORE_ID = "store-hn-uuid";
const TS = 1780234832126; // a real epoch ms

/* ── fixture builders mirroring the real C03 JSON shape ── */

const NO_CUTLERY = { item_id: "SERVICE_801", item_name: "Không dao dĩa | No Cutlery", quantity: 1 };
const POUR_IN = { item_id: "SERVICE_802", item_name: "Đổ xốt vào bát | Pour-in Dressing", quantity: 1 };

function byoLine(id: string, toppings: unknown[]) {
  return {
    id,
    item_name: "Build-Your-Own",
    item_type_name: "TỰ CHỌN | BUILD YOUR OWN",
    toppings,
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

test("parseByoBowls — a 2-BYO order splits into 2 bowls, each with its own ingredients", () => {
  const raw = [
    order({
      tran_id: "ORD-1",
      sale_detail: [
        byoLine("line-A", [
          { item_id: "ITEM-BASE_001", item_name: "Rau rocket | Arugula", quantity: 1 },
          NO_CUTLERY,
        ]),
        // a non-BYO line in the same order must be ignored
        { id: "line-sig", item_name: "Signature Bowl", item_type_name: "SIGNATURE", toppings: [] },
        byoLine("line-B", [
          { item_id: "ITEM-PROT_009", item_name: "Gà nướng | Grilled Chicken", quantity: 2 },
          POUR_IN,
        ]),
      ],
    }),
  ];

  const { bowls, stats } = parseByoBowls(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);

  assert.equal(stats.bowlsParsed, 2, "two BYO lines → two distinct bowls");
  assert.equal(stats.byoLinesFound, 2);

  const a = bowls.find((b) => b.ipos_line_id === "line-A")!;
  const b = bowls.find((b) => b.ipos_line_id === "line-B")!;
  assert.ok(a && b, "both bowls present");
  assert.equal(a.ipos_tran_id, "ORD-1");
  assert.equal(b.ipos_tran_id, "ORD-1");

  // Ingredients stay separated per bowl — no flattening / cross-contamination.
  assert.deepEqual(
    a.ingredients.map((i) => i.item_id),
    ["ITEM-BASE_001", "SERVICE_801"],
  );
  assert.deepEqual(
    b.ingredients.map((i) => i.item_id),
    ["ITEM-PROT_009", "SERVICE_802"],
  );
});

test("parseByoBowls — modifiers flagged via SERVICE_ class, real items are not", () => {
  const raw = [
    order({
      tran_id: "ORD-2",
      sale_detail: [
        byoLine("line-C", [
          { item_id: "ITEM-BASE_001", item_name: "Rau rocket | Arugula", quantity: 1 },
          NO_CUTLERY, // SERVICE_801
          POUR_IN, // SERVICE_802
        ]),
      ],
    }),
  ];

  const { bowls, stats } = parseByoBowls(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);
  const ings = bowls[0].ingredients;

  const arugula = ings.find((i) => i.item_id === "ITEM-BASE_001")!;
  const cutlery = ings.find((i) => i.item_id === "SERVICE_801")!;
  const dressing = ings.find((i) => i.item_id === "SERVICE_802")!;

  assert.equal(arugula.is_modifier, false, "real ingredient is not a modifier");
  assert.equal(cutlery.is_modifier, true, "Không dao dĩa flagged by class, not name");
  assert.equal(dressing.is_modifier, true, "Đổ xốt vào bát flagged by class, not name");

  assert.equal(stats.realIngredients, 1);
  assert.equal(stats.modifierIngredients, 2);
  assert.deepEqual(stats.modifierItemIds, ["SERVICE_801", "SERVICE_802"]);
});

test("parseByoBowls — preserves quantity and keys on item_id", () => {
  const raw = [
    order({
      tran_id: "ORD-3",
      sale_detail: [
        byoLine("line-D", [
          { item_id: "ITEM-PROT_009", item_name: "Gà | Chicken", quantity: 3 },
        ]),
      ],
    }),
  ];
  const { bowls } = parseByoBowls(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);
  const ing = bowls[0].ingredients[0];
  assert.equal(ing.item_id, "ITEM-PROT_009");
  assert.equal(ing.quantity, 3);
});

test("parseByoBowls — reuses TSK-148 normalizer + store map; keeps phoneless bowls", () => {
  const raw = [
    order({ tran_id: "P1", extra_data: { customer_phone: "84936336649" }, sale_detail: [byoLine("l1", [])] }),
    order({ tran_id: "P2", extra_data: { customer_phone: "8410000232" }, sale_detail: [byoLine("l2", [])] }), // placeholder → null
    order({ tran_id: "P3", extra_data: {}, sale_detail: [byoLine("l3", [])] }), // no phone → null
    order({ tran_id: "WS", store_uid: IPOS_STORE_UIDS.HCM, sale_detail: [byoLine("l4", [])] }), // wrong store
  ];
  const { bowls, stats } = parseByoBowls(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);

  assert.equal(stats.droppedWrongStore, 1, "HCM file content dropped from an HN import");
  assert.equal(bowls.length, 3);
  assert.equal(bowls.find((b) => b.ipos_line_id === "l1")!.phone, "0936336649"); // 84 → 0
  assert.equal(bowls.find((b) => b.ipos_line_id === "l2")!.phone, null); // placeholder
  assert.equal(bowls.find((b) => b.ipos_line_id === "l3")!.phone, null); // blank
  assert.equal(stats.attributable, 1);
  assert.equal(stats.phoneless, 2);
  bowls.forEach((b) => assert.equal(b.store_id, HN_STORE_ID));
});

test("parseByoBowls — BYO line with no id is dropped", () => {
  const raw = [order({ tran_id: "ORD-X", sale_detail: [byoLine("", [])] })];
  const { bowls, stats } = parseByoBowls(raw, HN_STORE_ID, IPOS_STORE_UIDS.HN);
  assert.equal(bowls.length, 0);
  assert.equal(stats.byoLinesFound, 1);
  assert.equal(stats.droppedNoLineId, 1);
});

/* ─────────────── applyByoBowls — upsert + idempotency ─────────────── */

/** In-memory ByoStore. `profiles` maps a phone → profile id. */
function memStore(profiles: Record<string, string> = {}) {
  const bowlRows: Array<NewBowl & { id: string }> = [];
  const ingredientRows: NewIngredient[] = [];
  let seq = 0;

  const store: ByoStore = {
    async findProfileIdByPhone(phone) {
      return profiles[phone] ?? null;
    },
    async hasBowlForLineId(lineId) {
      return bowlRows.some((b) => b.ipos_line_id === lineId);
    },
    async insertBowl(bowl) {
      if (bowlRows.some((b) => b.ipos_line_id === bowl.ipos_line_id)) {
        return { ok: false, duplicate: true };
      }
      const id = `bowl-${++seq}`;
      bowlRows.push({ ...bowl, id });
      return { ok: true, bowlId: id };
    },
    async insertIngredients(ings) {
      ingredientRows.push(...ings);
    },
  };
  return { store, bowlRows, ingredientRows };
}

function bowl(overrides: Partial<ByoBowl> = {}): ByoBowl {
  return {
    ipos_tran_id: "ORD-1",
    ipos_line_id: "line-" + Math.random().toString(36).slice(2),
    store_id: HN_STORE_ID,
    phone: "0936336649",
    ordered_at: new Date(TS).toISOString(),
    ingredients: [
      { item_id: "ITEM-BASE_001", item_name: "Arugula", quantity: 1, is_modifier: false },
      { item_id: "SERVICE_801", item_name: "No Cutlery", quantity: 1, is_modifier: true },
    ],
    ...overrides,
  };
}

test("applyByoBowls — links to profile when phone matches, keeps phone otherwise", async () => {
  const { store, bowlRows } = memStore({ "0936336649": "profile-abc" });
  const bowls = [
    bowl({ ipos_line_id: "L1", phone: "0936336649" }), // matched → linked
    bowl({ ipos_line_id: "L2", phone: "0900000001" }), // phone, no account → phone only
    bowl({ ipos_line_id: "L3", phone: null }), // anonymous
  ];
  const s = await applyByoBowls(store, bowls);

  assert.equal(s.inserted, 3);
  assert.equal(s.linkedToProfile, 1);
  assert.equal(s.phoneOnly, 1);
  assert.equal(s.anonymous, 1);

  const r1 = bowlRows.find((b) => b.ipos_line_id === "L1")!;
  assert.equal(r1.profile_id, "profile-abc");
  assert.equal(r1.phone, "0936336649", "phone kept even when linked");
  assert.equal(r1.ingredient_count, 1, "ingredient_count counts real ingredients only");

  const r2 = bowlRows.find((b) => b.ipos_line_id === "L2")!;
  assert.equal(r2.profile_id, null);
  assert.equal(r2.phone, "0900000001", "phone kept when no account");
});

test("applyByoBowls — idempotent on ipos_line_id (same file twice = same rows)", async () => {
  const { store, bowlRows, ingredientRows } = memStore({ "0936336649": "profile-abc" });
  const bowls = [bowl({ ipos_line_id: "L1" }), bowl({ ipos_line_id: "L2" })];

  const first = await applyByoBowls(store, bowls);
  assert.equal(first.inserted, 2);
  const bowlsAfterFirst = bowlRows.length;
  const ingsAfterFirst = ingredientRows.length;

  const second = await applyByoBowls(store, bowls);
  assert.equal(second.inserted, 0);
  assert.equal(second.skippedExisting, 2);
  assert.equal(bowlRows.length, bowlsAfterFirst, "re-import adds no bowls");
  assert.equal(ingredientRows.length, ingsAfterFirst, "re-import adds no ingredients");
});

test("applyByoBowls — undated bowls are skipped (ordered_at NOT NULL)", async () => {
  const { store, bowlRows } = memStore();
  const s = await applyByoBowls(store, [bowl({ ipos_line_id: "L1", ordered_at: null })]);
  assert.equal(s.inserted, 0);
  assert.equal(s.skippedUndated, 1);
  assert.equal(bowlRows.length, 0);
});

test("applyByoBowls — writes one ingredient row per topping with flags + quantities", async () => {
  const { store, ingredientRows } = memStore();
  await applyByoBowls(store, [
    bowl({
      ipos_line_id: "L1",
      ingredients: [
        { item_id: "ITEM-BASE_001", item_name: "Arugula", quantity: 2, is_modifier: false },
        { item_id: "ITEM-PROT_009", item_name: "Chicken", quantity: 1, is_modifier: false },
        { item_id: "SERVICE_801", item_name: "No Cutlery", quantity: 1, is_modifier: true },
      ],
    }),
  ]);
  assert.equal(ingredientRows.length, 3);
  const arugula = ingredientRows.find((i) => i.item_id === "ITEM-BASE_001")!;
  assert.equal(arugula.quantity, 2);
  assert.equal(ingredientRows.filter((i) => i.is_modifier).length, 1);
});
