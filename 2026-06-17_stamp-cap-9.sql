-- Stamp cap 8 → 9 (TSK-147b) — DB ceiling fix.
-- Run in Supabase SQL Editor. NOT yet applied to prod at commit time — Hieu
-- applies this one manually (unlike the order-items migration).
--
-- TSK-147 moved the loyalty card to 9 stamps (10th item free) and bumped
-- STAMPS_REQUIRED to 9 across the app, the iPOS apply rollover, and the loyalty
-- API. But the two DB CHECK constraints were left at 8, so the 9th stamp (a full
-- card) and any UX progression test past 8 are rejected at write time. Bump both
-- ceilings to 9 to match the single source of truth in lib/types/loyalty.ts.

ALTER TABLE public.stamp_cards
  DROP CONSTRAINT IF EXISTS stamp_cards_stamps_collected_check;
ALTER TABLE public.stamp_cards
  ADD CONSTRAINT stamp_cards_stamps_collected_check
  CHECK (stamps_collected >= 0 AND stamps_collected <= 9);

ALTER TABLE public.stamp_entries
  DROP CONSTRAINT IF EXISTS stamp_entries_stamp_number_check;
ALTER TABLE public.stamp_entries
  ADD CONSTRAINT stamp_entries_stamp_number_check
  CHECK (stamp_number >= 1 AND stamp_number <= 9);
