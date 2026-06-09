-- Verified-phone stamp gate + persisted iPOS orders (TSK-155) — schema migration.
-- Run in Supabase SQL Editor (or via apply_migration) BEFORE the next
-- non-dry-run `npm run import:ipos`. Additive + IF-NOT-EXISTS guarded.
--
-- Hieu's rule (TSK-155): a profile earns Magic Stamps AND BYO attribution ONLY
-- when profiles.phone_verified = true. The eligibility gate in applyStamps /
-- applyByoBowls flips from "profiles.phone present" to "phone_verified = true
-- AND phone matches" (the older phone-OTP signup path no longer counts until
-- the customer retro-verifies via Zalo OTP, TSK-149).
--
-- Option B: to make that loss-less, persist EVERY attributable iPOS order here
-- (one row per tran_id, phone-bearing — parseEodOrders already drops phoneless /
-- placeholder rows). Unverified/unmatched orders are stored with profile_id
-- NULL; when the customer later verifies, lib/loyalty/backfill links these rows
-- onto their profile AND replays them into stamp_entries (idempotent on
-- ipos_tran_id), so a later-verifier reclaims BOTH past stamps and BYO bowls.
--
-- Imports run as service-role (bypass RLS); the owner-read policy below only
-- governs the customer-facing read path: a customer sees only their own orders.
-- Mirrors the byo_bowls shape from TSK-153 (ordered_at NOT NULL; phone /
-- store_id / profile_id nullable for aggregate-trend flexibility + soft-detach).

CREATE TABLE IF NOT EXISTS public.ipos_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipos_tran_id  text NOT NULL UNIQUE,
  store_id      uuid REFERENCES public.stores(id),
  phone         text,
  profile_id    uuid REFERENCES public.profiles(id),
  ordered_at    timestamptz NOT NULL,
  source        text NOT NULL DEFAULT 'ipos_eod',
  created_at    timestamptz DEFAULT now()
);

-- Lookups the import + back-fill make (phone replay; owner reads).
CREATE INDEX IF NOT EXISTS ipos_orders_phone_idx      ON public.ipos_orders (phone);
CREATE INDEX IF NOT EXISTS ipos_orders_profile_id_idx ON public.ipos_orders (profile_id);

-- RLS: a customer reads only their OWN orders (profile_id = the logged-in user).
-- Service-role imports bypass RLS, so no write policy is needed for them.
ALTER TABLE public.ipos_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ipos_orders_owner_read" ON public.ipos_orders;
CREATE POLICY "ipos_orders_owner_read" ON public.ipos_orders
  FOR SELECT USING (profile_id = auth.uid());
