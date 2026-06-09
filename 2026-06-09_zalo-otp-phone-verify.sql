-- Zalo OTP retroactive phone verification (TSK-149) — additive schema.
-- Run in Supabase SQL Editor (or via apply_migration). All changes are additive
-- and IF-NOT-EXISTS guarded, so the migration is safe to re-run.
--
-- 1) profiles gains an explicit phone_verified flag + timestamp.
--    IMPORTANT: this defaults FALSE on every existing row. It marks ONLY the new
--    Zalo retro-verify path (TSK-149); it is NOT a backfill of the older
--    phone-OTP signup path, and it is NOT used to gate TSK-148 stamp eligibility
--    (which still keys on profiles.phone presence). Treat false as "unknown",
--    not "unverified", for pre-TSK-149 accounts.
--
-- 2) otp_purpose gains 'verify' so retro-verify OTPs don't collide with an
--    in-flight signup/reset OTP for the same phone.
--    (ALTER TYPE ... ADD VALUE is transaction-safe here because the new label is
--    not USED in this migration — only added.)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

ALTER TYPE public.otp_purpose ADD VALUE IF NOT EXISTS 'verify';
