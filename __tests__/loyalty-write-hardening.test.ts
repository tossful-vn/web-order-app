/**
 * TOS-60 — loyalty stamp writes are service-role only.
 *
 * The self-grant hole was that app/api/loyalty/route.ts wrote stamp_cards /
 * stamp_entries through the RLS *user* client, relying on policies that only
 * checked `auth.uid() = user_id`. Any authenticated customer could therefore
 * bump their own stamp count straight from the Supabase JS client.
 *
 * There is no live DB in this suite, so RLS itself can't be exercised here.
 * Instead this is a source-level regression guard for the invariant that makes
 * the dropped-policy state safe:
 *   1. EVERY stamp_cards / stamp_entries write goes through the service-role
 *      `admin` client — never the RLS `supabase` client.
 *   2. Every stamp_cards write is explicitly fenced to the authed `user.id`
 *      (admin bypasses RLS, so that code-level guard is the only fence).
 *   3. SELECTs stay on the RLS client (defence-in-depth: a row only comes back
 *      if it's the user's, so any card.id we then write by is user-owned).
 *   4. The migration drops the three customer write policies and KEEPS the two
 *      read policies.
 *
 * Run: npm test   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROUTE = readFileSync(
  path.resolve(process.cwd(), "app/api/loyalty/route.ts"),
  "utf8",
);
const MIGRATION = readFileSync(
  path.resolve(process.cwd(), "2026-06-17_stamp-writes-service-role-only.sql"),
  "utf8",
);

/** Whitespace-stripped source — makes chained `.from().insert()` checks robust
 * to the formatter splitting calls across lines. */
const SRC = ROUTE.replace(/\s/g, "");

const TABLES = ["stamp_cards", "stamp_entries"] as const;
const WRITES = ["insert", "update", "delete"] as const;

test("route uses the service-role admin client", () => {
  assert.match(ROUTE, /import\s*\{\s*createAdminClient\s*\}\s*from\s*"@\/lib\/supabase\/admin"/);
  assert.ok(SRC.includes("constadmin=createAdminClient()"), "admin client must be created");
});

test("NO stamp write goes through the RLS user client", () => {
  for (const tbl of TABLES) {
    for (const verb of WRITES) {
      assert.ok(
        !SRC.includes(`supabase.from("${tbl}").${verb}`),
        `${tbl}.${verb} must NOT run on the RLS user client (self-grant hole)`,
      );
    }
  }
});

test("every stamp write goes through the admin client", () => {
  // The writes the route actually performs.
  assert.ok(SRC.includes(`admin.from("stamp_cards").insert`), "card insert via admin");
  assert.ok(SRC.includes(`admin.from("stamp_cards").update`), "card update via admin");
  assert.ok(SRC.includes(`admin.from("stamp_entries").insert`), "entry insert via admin");
  assert.ok(SRC.includes(`admin.from("stamp_entries").delete`), "entry delete via admin");
});

test("every stamp_cards write is fenced to the authed user.id", () => {
  // card.id fences add_test_stamp / remove_test_stamp / reset_test_card updates;
  // readyCard.id fences redeem_reward. Both card-creation inserts set user_id.
  assert.ok(
    SRC.includes(`.eq("id",card.id).eq("user_id",user.id)`),
    "card.id updates must also fence on user_id",
  );
  assert.ok(
    SRC.includes(`.eq("id",readyCard.id).eq("user_id",user.id)`),
    "redeem update must fence on user_id",
  );
  assert.ok(
    SRC.includes(`admin.from("stamp_cards").insert({user_id:user.id})`),
    "card inserts must set user_id explicitly",
  );
});

test("auth + reads still go through the RLS client", () => {
  assert.ok(SRC.includes("supabase.auth.getUser()"), "auth stays on the RLS client");
  assert.ok(SRC.includes(`supabase.from("stamp_cards").select`), "card reads stay RLS-scoped");
  assert.ok(SRC.includes(`supabase.from("stamp_entries").select`), "entry reads stay RLS-scoped");
});

test("migration drops the three customer write policies", () => {
  assert.match(MIGRATION, /DROP POLICY IF EXISTS "Users update own cards" ON public\.stamp_cards/);
  assert.match(MIGRATION, /DROP POLICY IF EXISTS "System inserts cards" ON public\.stamp_cards/);
  assert.match(MIGRATION, /DROP POLICY IF EXISTS "System inserts stamps" ON public\.stamp_entries/);
});

test("migration KEEPS the read policies (does not drop them)", () => {
  assert.ok(
    !/DROP POLICY[^\n]*"Users read own cards"/.test(MIGRATION),
    "must not drop the stamp_cards read policy",
  );
  assert.ok(
    !/DROP POLICY[^\n]*"Users read own stamps"/.test(MIGRATION),
    "must not drop the stamp_entries read policy",
  );
});
