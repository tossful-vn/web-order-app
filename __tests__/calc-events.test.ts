/**
 * TSK-169 — analytics taxonomy wrapper for /nutrition.
 *
 * Covers: every typed event emits the right name; the first-touch source
 * (src + utm_*) and lang are auto-merged onto EVERY event; event-specific
 * payload keys are present. The @vercel/analytics sink is swapped for a spy.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { captureSource } from "@/lib/analytics/source";
import * as events from "@/lib/analytics/events";

type Call = { name: string; props: Record<string, unknown> };
const calls: Call[] = [];

const BEACONS =
  "?src=beacons&utm_source=beacons&utm_medium=link&utm_campaign=launch_2026q2";

function memStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

before(() => {
  // Populate a fake sessionStorage with beacons attribution, then expose it as
  // window.sessionStorage so events' getSource() merges it onto every payload.
  const store = memStorage();
  captureSource(BEACONS, store);
  (globalThis as unknown as { window: unknown }).window = { sessionStorage: store };
  events.__setTrackSink((name, props) => calls.push({ name, props }));
});

after(() => {
  events.__resetTrackSink();
  delete (globalThis as unknown as { window?: unknown }).window;
});

beforeEach(() => {
  calls.length = 0;
});

test("every event auto-merges first-touch source + lang", () => {
  events.trackCalcLanded("vi");
  assert.equal(calls.length, 1);
  const { name, props } = calls[0];
  assert.equal(name, "calc_landed");
  assert.equal(props.src, "beacons");
  assert.equal(props.utm_source, "beacons");
  assert.equal(props.utm_medium, "link");
  assert.equal(props.utm_campaign, "launch_2026q2");
  assert.equal(props.lang, "vi");
});

test("lang toggle carries the target locale", () => {
  events.trackCalcLangToggled("en", "en");
  assert.equal(calls[0].name, "calc_lang_toggled");
  assert.equal(calls[0].props.to, "en");
});

test("signature pick carries the signature name", () => {
  events.trackCalcSignaturePicked("en", "Kale My Ex");
  assert.equal(calls[0].name, "calc_signature_picked");
  assert.equal(calls[0].props.signature, "Kale My Ex");
});

test("byo started fires the right name", () => {
  events.trackCalcByoStarted("en");
  assert.equal(calls[0].name, "calc_byo_started");
});

test("ingredient add / remove carry id, name, category, count", () => {
  const meta = { ingredient_id: "i1", ingredient: "Kale", category: "Base", ingredient_count: 2 };
  events.trackCalcIngredientAdded("en", meta);
  events.trackCalcIngredientRemoved("en", { ...meta, ingredient_count: 1 });
  assert.equal(calls[0].name, "calc_ingredient_added");
  assert.equal(calls[0].props.ingredient_id, "i1");
  assert.equal(calls[0].props.category, "Base");
  assert.equal(calls[0].props.ingredient_count, 2);
  assert.equal(calls[1].name, "calc_ingredient_removed");
  assert.equal(calls[1].props.ingredient_count, 1);
});

test("completed carries ingredient_count + kcal", () => {
  events.trackCalcCompleted("en", { ingredient_count: 4, kcal: 530 });
  assert.equal(calls[0].name, "calc_completed");
  assert.equal(calls[0].props.ingredient_count, 4);
  assert.equal(calls[0].props.kcal, 530);
});

test("save-bowl click carries auth + count", () => {
  events.trackCalcSaveBowlClicked("en", { auth: "anonymous", ingredient_count: 3 });
  assert.equal(calls[0].name, "calc_save_bowl_clicked");
  assert.equal(calls[0].props.auth, "anonymous");
});

test("on-ramp shown / clicked fire the right names", () => {
  events.trackCalcOnrampShown("en");
  events.trackCalcOnrampClicked("en");
  assert.deepEqual(calls.map((c) => c.name), ["calc_onramp_shown", "calc_onramp_clicked"]);
});

test("bowl saved carries bowl_id + phone_verified", () => {
  events.trackCalcBowlSaved("en", { bowl_id: "b9", ingredient_count: 5, phone_verified: true });
  assert.equal(calls[0].name, "calc_bowl_saved");
  assert.equal(calls[0].props.bowl_id, "b9");
  assert.equal(calls[0].props.phone_verified, true);
});

test("beacons CTA shown / clicked carry the trigger", () => {
  events.trackCalcBeaconsCtaShown("en", "3-ingredient");
  events.trackCalcBeaconsCtaClicked("en", "footer");
  assert.equal(calls[0].name, "calc_beacons_cta_shown");
  assert.equal(calls[0].props.trigger, "3-ingredient");
  assert.equal(calls[1].name, "calc_beacons_cta_clicked");
  assert.equal(calls[1].props.trigger, "footer");
});
