-- 2026-06-17_stamp-writes-service-role-only.sql
-- TOS-60 — lock loyalty stamp writes to service-role so a customer can never
-- self-grant stamps (and thus a free item).
--
-- ⚠️ NOT YET APPLIED to prod. Hieu applies this manually in the Supabase SQL
-- Editor AFTER the TOS-60 PR merges. Committed here as the record. DO NOT apply
-- it before the route change ships — the app must be writing via the
-- service-role admin client first, or the loyalty endpoint breaks.
--
-- WHY: the loyalty endpoint (app/api/loyalty/route.ts) used to write stamp_cards
-- and stamp_entries through the RLS *user* client, relying on three permissive
-- policies. Because those policies only checked `auth.uid() = user_id`, ANY
-- authenticated customer could bump their own stamp count straight from the
-- Supabase JS client (self-grant a free item), bypassing the endpoint's logic.
--
-- The route now performs every write through the service-role admin client
-- (which bypasses RLS), with each write explicitly fenced to the authed user.id
-- in code. So these customer-facing WRITE policies are no longer needed — and
-- dropping them closes the self-grant hole.
--
-- The iPOS EOD accrual (lib/ipos/applyStamps.ts → createSupabaseStampStore)
-- already uses the service-role client and bypasses RLS, so it is unaffected.

-- ── stamp_cards: drop the customer UPDATE + INSERT policies ──
-- "Users update own cards" let a customer raise stamps_collected / flip
-- reward_status directly. "System inserts cards" let them insert their own card.
-- Both card creation paths (ensure_card, redeem_reward roll-over) now run on the
-- admin client, so nothing relies on a client-side card insert anymore.
DROP POLICY IF EXISTS "Users update own cards" ON public.stamp_cards;
DROP POLICY IF EXISTS "System inserts cards" ON public.stamp_cards;

-- ── stamp_entries: drop the customer INSERT policy ──
-- "System inserts stamps" let a customer insert stamp rows for their own card.
-- All stamp inserts now run on the admin client.
DROP POLICY IF EXISTS "System inserts stamps" ON public.stamp_entries;

-- ── KEEP the read policies ──
-- "Users read own cards" (stamp_cards SELECT) and "Users read own stamps"
-- (stamp_entries SELECT) stay: the route still reads cards/entries through the
-- RLS user client so the customer can see their own card. RLS remains ENABLED on
-- both tables, so with the write policies gone a non-service-role client can
-- read but can no longer INSERT/UPDATE/DELETE.

-- ── Verification (run after applying; expect read-only policies only) ──
-- Expect exactly: stamp_cards → "Users read own cards" (SELECT);
--                 stamp_entries → "Users read own stamps" (SELECT).
-- No UPDATE/INSERT/DELETE policy should remain on either table.
--
--   SELECT tablename, policyname, cmd
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('stamp_cards', 'stamp_entries')
--   ORDER BY tablename, cmd;
