-- iPOS EOD → Magic Stamp sync (TSK-148) — schema migration.
-- ⚠️ DRAFT — DO NOT RUN until Hiếu confirms. Run in Supabase SQL Editor.
--
-- Why this is bigger than "just add an idempotency key":
--   stamp_cards.user_id is NOT NULL → auth.users(id). Only ~2 of the ~60 iPOS
--   customers (HN May) have a web account, so the current schema physically
--   cannot record a stamp for the other ~58 phones. To stamp dine-in/TA
--   customers (the whole point of TSK-148) a card must be keyable by PHONE
--   alone and later back-filled to a user_id at signup.
--
-- What the existing 18 stamp_entries inherit: source = 'manual' (they predate
-- the iPOS pipeline — test/seed rows), ipos_tran_id = NULL. iPOS inserts pass
-- source = 'ipos_eod' explicitly.

BEGIN;

-- 1. stamp_entries: provenance + idempotency on the iPOS order id ----------
ALTER TABLE public.stamp_entries
  ADD COLUMN IF NOT EXISTS ipos_tran_id text,
  ADD COLUMN IF NOT EXISTS source       text NOT NULL DEFAULT 'manual';
-- (existing 18 rows → source='manual' via the default; ipos_tran_id stays NULL)

-- Re-import never double-counts: one stamp per iPOS order, ever.
CREATE UNIQUE INDEX IF NOT EXISTS stamp_entries_ipos_tran_id_uniq
  ON public.stamp_entries (ipos_tran_id)
  WHERE ipos_tran_id IS NOT NULL;

-- 2. stamp_cards: allow phone-keyed cards (customer has no web account yet) --
ALTER TABLE public.stamp_cards
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS phone text
    CONSTRAINT stamp_cards_phone_check CHECK (phone IS NULL OR phone ~ '^0[0-9]{9}$');

-- A card belongs to a user OR a phone (or both, once back-filled at signup).
ALTER TABLE public.stamp_cards
  ADD CONSTRAINT stamp_cards_owner_chk CHECK (user_id IS NOT NULL OR phone IS NOT NULL);

-- At most one OPEN phone-only card per phone → race-safe find/create.
CREATE UNIQUE INDEX IF NOT EXISTS stamp_cards_phone_collecting_uniq
  ON public.stamp_cards (phone)
  WHERE phone IS NOT NULL AND user_id IS NULL AND reward_status = 'collecting';

COMMIT;

-- Back-fill at signup (follow-up, NOT in this migration): when a phone registers,
--   UPDATE public.stamp_cards SET user_id = <new user> WHERE user_id IS NULL AND phone = <phone>;
-- so previously phone-only stamps appear on their account.
