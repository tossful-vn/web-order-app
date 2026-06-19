-- Community best-sellers aggregate (TSK-173 PR1) — schema migration.
-- Run in Supabase SQL Editor (or via apply_migration) AFTER 2026-06-16_ipos-order-items.sql.
--
-- NOT YET APPLIED to prod — Hieu applies after review. Committed as the record.
--
-- A SECURITY DEFINER function that aggregates `ipos_order_items` into a no-PII
-- "what the community orders most" list, powering the deterministic chatbot's
-- community-favourites flow (TSK-173 PR2) and any social-proof surface.
--
-- WHY a function (not a view + RLS): callers are anon/authenticated customers who
-- have NO row-level read access to other people's order items (the owner-read
-- policy only exposes a customer's OWN rows). The aggregate must see ALL rows to
-- be meaningful, so it runs with DEFINER rights — but it returns ONLY aggregate,
-- non-identifying columns. It NEVER selects phone or profile_id, so no PII can
-- leak through it even though it reads every row.
--
-- WHAT it counts:
--   * is_modifier = false  → service lines (No Cutlery, pour-in dressing, the
--     SERVICE_ class) are excluded; they are not orderable menu items and would
--     otherwise dominate the list.
--   * item_id IS NOT NULL  → a best-seller has to map back to a menu/BYO entry
--     so the chatbot can link to it; un-ided lines are dropped.
--   * ordered_at >= p_since → rolling window (default last 30 days).
--   * p_store_id NULL      → all stores; otherwise that store only.
--   total_qty   = SUM(quantity)            (how many units sold)
--   order_count = COUNT(DISTINCT ipos_tran_id) (how many orders included it)
-- Ordered by total_qty DESC, then order_count DESC, capped at p_limit.

CREATE OR REPLACE FUNCTION public.community_top_items(
  p_store_id uuid          DEFAULT NULL,
  p_since    timestamptz   DEFAULT now() - interval '30 days',
  p_limit    int           DEFAULT 5
)
RETURNS TABLE (
  item_id        text,
  item_name      text,
  item_type_name text,
  total_qty      numeric,
  order_count    bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    oi.item_id,
    -- A given item_id can carry slightly different names across lines; pick the
    -- most-recent non-blank label deterministically via max() on the grouped set.
    max(oi.item_name)                       AS item_name,
    max(oi.item_type_name)                  AS item_type_name,
    sum(oi.quantity)                        AS total_qty,
    count(DISTINCT oi.ipos_tran_id)         AS order_count
  FROM public.ipos_order_items oi
  WHERE oi.is_modifier = false
    AND oi.item_id IS NOT NULL
    AND oi.ordered_at >= p_since
    AND (p_store_id IS NULL OR oi.store_id = p_store_id)
  GROUP BY oi.item_id
  ORDER BY sum(oi.quantity) DESC, count(DISTINCT oi.ipos_tran_id) DESC
  LIMIT GREATEST(p_limit, 0);
$$;

-- Callers need no table RLS access; the body reads with definer rights and only
-- ever returns the aggregate, non-PII columns declared above.
GRANT EXECUTE ON FUNCTION public.community_top_items(uuid, timestamptz, int) TO anon, authenticated;
