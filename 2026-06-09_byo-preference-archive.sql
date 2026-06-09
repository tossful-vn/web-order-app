-- BYO preference archive (TSK-153, Part A) — schema migration.
-- Run in Supabase SQL Editor (or via the import flow's apply_migration) BEFORE
-- the first non-dry-run `npm run import:ipos`.
--
-- Archives each customer's Build-Your-Own bowls from the iPOS C03 JSON for
-- later personalised recs. One row per BYO `sale_detail` line (idempotent on
-- ipos_line_id), with its own nested ingredients. Bowls link to a web account
-- when the phone matches a verified profile, else keep the phone for aggregate
-- trends. Imports run as service-role (bypass RLS); RLS below only governs the
-- customer-facing read path: a customer sees only their own bowls.

CREATE TABLE IF NOT EXISTS public.byo_bowls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipos_tran_id    text NOT NULL,
  ipos_line_id    text NOT NULL UNIQUE,
  profile_id      uuid REFERENCES public.profiles(id),
  phone           text,
  store_id        uuid REFERENCES public.stores(id),
  ordered_at      timestamptz NOT NULL,
  ingredient_count int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.byo_bowl_ingredients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bowl_id     uuid NOT NULL REFERENCES public.byo_bowls(id) ON DELETE CASCADE,
  item_id     text,
  item_name   text NOT NULL,
  quantity    numeric NOT NULL DEFAULT 1,
  is_modifier boolean NOT NULL DEFAULT false
);

-- Lookups the import + recs layer make.
CREATE INDEX IF NOT EXISTS byo_bowls_profile_id_idx ON public.byo_bowls (profile_id);
CREATE INDEX IF NOT EXISTS byo_bowls_phone_idx ON public.byo_bowls (phone);
CREATE INDEX IF NOT EXISTS byo_bowl_ingredients_bowl_id_idx ON public.byo_bowl_ingredients (bowl_id);

-- RLS: a customer reads only their OWN bowls (profile_id = the logged-in user).
-- Service-role imports bypass RLS, so no write policy is needed for them.
ALTER TABLE public.byo_bowls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.byo_bowl_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "byo_bowls_owner_read" ON public.byo_bowls;
CREATE POLICY "byo_bowls_owner_read" ON public.byo_bowls
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "byo_bowl_ingredients_owner_read" ON public.byo_bowl_ingredients;
CREATE POLICY "byo_bowl_ingredients_owner_read" ON public.byo_bowl_ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.byo_bowls b
      WHERE b.id = byo_bowl_ingredients.bowl_id
        AND b.profile_id = auth.uid()
    )
  );
