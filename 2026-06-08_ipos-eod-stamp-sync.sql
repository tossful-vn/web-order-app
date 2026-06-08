-- iPOS EOD → Magic Stamp sync (TSK-148) — schema migration.
-- Run in Supabase SQL Editor (or via the import flow's apply_migration).
--
-- Magic Stamps are for web-account holders only (stamps start at verified
-- signup), so a stamp always belongs to a user and stamp_cards keeps its base
-- shape (user_id NOT NULL). This migration only adds idempotency + provenance
-- so a re-import never double-counts.
--
-- The existing 18 stamp_entries inherit source='manual' via the default
-- (they predate the iPOS pipeline). iPOS inserts pass source='ipos_eod'.

ALTER TABLE public.stamp_entries
  ADD COLUMN IF NOT EXISTS ipos_tran_id text,
  ADD COLUMN IF NOT EXISTS source       text NOT NULL DEFAULT 'manual';

-- Re-import never double-counts: one stamp per iPOS order, ever.
CREATE UNIQUE INDEX IF NOT EXISTS stamp_entries_ipos_tran_id_uniq
  ON public.stamp_entries (ipos_tran_id)
  WHERE ipos_tran_id IS NOT NULL;
