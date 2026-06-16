/**
 * TSK-169 — MvpShell is the minimal /nutrition shell, NOT AppShell.
 *
 * Covers: renders the brand logo + EN/VI toggle + Beacons footer CTA and its
 * children, and renders NONE of AppShell's nav/drawer chrome (My week, Saved
 * bowls, My Tossful, the Menu drawer, Sign in). Uses react-dom/server static
 * render — no jsdom needed.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The app uses the automatic JSX runtime via Next; under tsx the .client.tsx
// files compile to classic React.createElement calls, so expose React globally
// for the component bodies that reference it at render time.
(globalThis as unknown as { React: typeof React }).React = React;

import MvpShell from "@/app/nutrition/MvpShell.client";

function render() {
  return renderToStaticMarkup(
    React.createElement(
      MvpShell,
      null,
      React.createElement("div", null, "CALC_CHILD_MARKER"),
    ),
  );
}

test("MvpShell renders the brand logo, EN/VI toggle and children", () => {
  const html = render();
  assert.match(html, /Tossful/, "brand logo present");
  assert.match(html, />EN</, "EN toggle present");
  assert.match(html, />VI</, "VI toggle present");
  assert.match(html, /CALC_CHILD_MARKER/, "children rendered");
});

test("MvpShell renders the Beacons footer CTA (acquisition loop)", () => {
  const html = render();
  assert.match(html, /beacons\.ai\/tossful/, "footer links to Beacons");
  assert.match(html, /Order here/, "footer Order-here copy present");
});

test("MvpShell renders NONE of AppShell's nav / drawer chrome", () => {
  const html = render();
  // AppShell nav labels + drawer affordances must be absent on /nutrition.
  for (const forbidden of ["My week", "Saved bowls", "My Tossful", "Sign in", "Send feedback"]) {
    assert.ok(
      !html.includes(forbidden),
      `MvpShell must not render AppShell chrome: "${forbidden}"`,
    );
  }
  // No drawer dialog role from AppShell's aside.
  assert.ok(!/role="dialog"/.test(html), "no AppShell drawer dialog");
});
