/**
 * TSK-169 — /nutrition Save-bowl auth branch (Option C).
 *
 * Covers the locked decision:
 *   • logged-in  → saveBowl() IS called, success → onSaved (DB write happened)
 *   • anonymous  → saveBowl() is NOT called, onAnonymous fires (popup + on-ramp)
 *   • logged-in error → onError, no onSaved
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { runSaveBowl, type SaveBowlOrchestratorDeps } from "@/lib/bowls/save-branch";

type Payload = { name: string };
const payload: Payload = { name: "Test bowl" };

/** Build deps with spies; saveBowl resolves to a row id by default. */
function spies(opts: { user: { id: string } | null; saveResult?: { id: string } | { error: string } }) {
  const log: string[] = [];
  let saveCalled = 0;
  const deps: SaveBowlOrchestratorDeps<Payload> = {
    getUser: async () => opts.user,
    saveBowl: async () => {
      saveCalled += 1;
      return opts.saveResult ?? { id: "bowl-123" };
    },
    onClick: (auth) => log.push("click:" + auth),
    onSaving: (s) => log.push("saving:" + s),
    onSaved: (id) => log.push("saved:" + id),
    onError: (m) => log.push("error:" + m),
    onAnonymous: () => log.push("anonymous"),
  };
  return { deps, log, get saveCalled() { return saveCalled; } };
}

test("logged-in → saveBowl IS called and onSaved fires with the new id", async () => {
  const s = spies({ user: { id: "u1" } });
  await runSaveBowl(payload, s.deps);
  assert.equal(s.saveCalled, 1, "DB save performed for a logged-in user");
  assert.deepEqual(s.log, ["click:logged_in", "saving:true", "saving:false", "saved:bowl-123"]);
  assert.ok(!s.log.includes("anonymous"), "anonymous path never runs when logged-in");
});

test("anonymous → saveBowl is NOT called and onAnonymous fires (popup + on-ramp)", async () => {
  const s = spies({ user: null });
  await runSaveBowl(payload, s.deps);
  assert.equal(s.saveCalled, 0, "NO DB write for an anonymous user");
  assert.deepEqual(s.log, ["click:anonymous", "anonymous"]);
  assert.ok(!s.log.some((l) => l.startsWith("saved:")), "onSaved never fires when anonymous");
});

test("logged-in save error → onError, no onSaved", async () => {
  const s = spies({ user: { id: "u1" }, saveResult: { error: "RLS denied" } });
  await runSaveBowl(payload, s.deps);
  assert.equal(s.saveCalled, 1);
  assert.deepEqual(s.log, ["click:logged_in", "saving:true", "saving:false", "error:RLS denied"]);
  assert.ok(!s.log.some((l) => l.startsWith("saved:")));
});
