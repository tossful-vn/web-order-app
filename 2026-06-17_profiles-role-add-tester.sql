-- 2026-06-17_profiles-role-add-tester.sql
-- TSK-147c support — allow 'tester' as a profiles.role value.
-- The 147c gate keys on profiles.role === 'tester', but the role CHECK only
-- permitted customer/staff/manager/admin, so the role could not be set.
-- ⚠️ ALREADY APPLIED to prod 2026-06-17 (Hieu). Commit as record; do NOT re-apply.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['customer'::text, 'staff'::text, 'manager'::text, 'admin'::text, 'tester'::text]));
