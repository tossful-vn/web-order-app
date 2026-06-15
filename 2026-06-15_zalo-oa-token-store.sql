-- Durable Zalo OA token store (TSK-156). Run in Supabase SQL Editor (or via
-- apply_migration). Additive + IF-NOT-EXISTS guarded, so safe to re-run.
--
-- WHY: Zalo OA access tokens expire (OAuth v4) and the refresh_token ROTATES on
-- every refresh. A static ZALO_OA_ACCESS_TOKEN env therefore stops working once
-- it expires. This table holds the singleton, rotating credential so the server
-- can mint a fresh access_token on demand (see lib/auth/zaloOaToken.ts).
--
-- SECURITY: these are server-only secrets. RLS is ENABLED with NO policies, so
-- anon/auth clients can never read or write them — only the service-role key
-- (lib/supabase/admin.ts) bypasses RLS. This mirrors public.phone_otp_pending.
--
-- Singleton: one row per OA, keyed by the natural oa_id. The app reads the single
-- row; today that means exactly one OA. (No id=1 guard, so a future HN/HCM brand
-- split could add a second OA row without another migration.)

create table if not exists public.zalo_oa_tokens (
  oa_id         text        primary key,
  access_token  text        not null,
  refresh_token text        not null,
  expires_at    timestamptz not null,
  updated_at    timestamptz not null default now()
);

alter table public.zalo_oa_tokens enable row level security;
-- (intentionally NO policies: only the service-role key may read/write secrets)
