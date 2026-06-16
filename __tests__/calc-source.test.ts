/**
 * TSK-169 — first-touch marketing attribution for /nutrition.
 *
 * Covers: ?src=beacons + all three utm params parsed, persisted to
 * sessionStorage, first-touch persistence (a later utm-less navigation does NOT
 * clobber), and the "direct" default when no src is present.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseSource,
  captureSource,
  getSource,
  CALC_SOURCE_KEY,
} from "@/lib/analytics/source";

/** In-memory sessionStorage stand-in (getItem/setItem only). */
function memStorage() {
  const map = new Map<string, string>();
  return {
    store: {
      getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
      setItem: (k: string, v: string) => void map.set(k, v),
    },
    map,
  };
}

const BEACONS =
  "?src=beacons&utm_source=beacons&utm_medium=link&utm_campaign=launch_2026q2";

test("parseSource — captures src + all three utm params", () => {
  const s = parseSource(BEACONS);
  assert.equal(s.src, "beacons");
  assert.equal(s.utm_source, "beacons");
  assert.equal(s.utm_medium, "link");
  assert.equal(s.utm_campaign, "launch_2026q2");
});

test("parseSource — defaults src to 'direct' and utm to null when absent", () => {
  const s = parseSource("");
  assert.equal(s.src, "direct");
  assert.equal(s.utm_source, null);
  assert.equal(s.utm_medium, null);
  assert.equal(s.utm_campaign, null);
});

test("captureSource — persists the parsed source to sessionStorage", () => {
  const { store, map } = memStorage();
  const s = captureSource(BEACONS, store);
  assert.equal(s.src, "beacons");
  assert.ok(map.has(CALC_SOURCE_KEY), "source written under the canonical key");
  const persisted = JSON.parse(map.get(CALC_SOURCE_KEY)!);
  assert.equal(persisted.utm_campaign, "launch_2026q2");
});

test("captureSource — first-touch wins: a later utm-less visit does not clobber", () => {
  const { store } = memStorage();
  captureSource(BEACONS, store); // first touch = beacons
  const second = captureSource("", store); // later nav, no params
  assert.equal(second.src, "beacons", "original beacons attribution retained");
  assert.equal(second.utm_campaign, "launch_2026q2");
  // getSource sees the same first-touch value.
  assert.equal(getSource(store).src, "beacons");
});

test("getSource — returns 'direct' default when nothing captured", () => {
  const { store } = memStorage();
  const s = getSource(store);
  assert.equal(s.src, "direct");
  assert.equal(s.utm_source, null);
});

test("getSource — survives a corrupt stored value (falls back to default)", () => {
  const { store } = memStorage();
  store.setItem(CALC_SOURCE_KEY, "{not valid json");
  const s = getSource(store);
  assert.equal(s.src, "direct");
});
