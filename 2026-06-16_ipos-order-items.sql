-- iPOS order-items capture (TSK-172) — schema migration.
-- Run in Supabase SQL Editor (or via the import flow's apply_migration) BEFORE
-- the first non-dry-run `npm run import:ipos` that captures item-level sales.
--
-- ALREADY APPLIED to prod — this file is committed as the schema record.
--
-- Captures EVERY iPOS `sale_detail` line (signature bowls, menu items, BYO, and
-- service modifiers) so the recs layer can compute community best-sellers and a
-- customer's favourite bowl. One row per line (idempotent on ipos_line_id), with
-- the item id/name/type preserved. Mirrors the BYO archive: rows link to a web
-- account when the phone matches a verified profile, else keep the phone for
-- aggregate trends, else stay anonymous. Imports run as service-role (bypass
-- RLS); the owner-read policy below only governs the customer-facing read path.

CREATE TABLE IF NOT EXISTS public.ipos_order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipos_tran_id    text NOT NULL,
  ipos_line_id    text NOT NULL UNIQUE,
  profile_id      uuid REFERENCES public.profiles(id),
  phone           text,
  store_id        uuid REFERENCES public.stores(id),
  ordered_at      timestamptz NOT NULL,
  item_id         text,
  item_name       text NOT NULL,
  item_type_name  text,
  quantity        numeric NOT NULL DEFAULT 1,
  is_modifier     boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- Lookups the import + recs layer make.
CREATE INDEX IF NOT EXISTS ipos_order_items_profile_id_idx ON public.ipos_order_items (profile_id);
CREATE INDEX IF NOT EXISTS ipos_order_items_phone_idx ON public.ipos_order_items (phone);
CREATE INDEX IF NOT EXISTS ipos_order_items_item_id_idx ON public.ipos_order_items (item_id);
CREATE INDEX IF NOT EXISTS ipos_order_items_store_id_idx ON public.ipos_order_items (store_id);
CREATE INDEX IF NOT EXISTS ipos_order_items_ordered_at_idx ON public.ipos_order_items (ordered_at);

-- RLS: a customer reads only their OWN items (profile_id = the logged-in user).
-- Service-role imports bypass RLS, so no write policy is needed for them.
ALTER TABLE public.ipos_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ipos_order_items_owner_read" ON public.ipos_order_items;
CREATE POLICY "ipos_order_items_owner_read" ON public.ipos_order_items
  FOR SELECT USING (profile_id = auth.uid());
