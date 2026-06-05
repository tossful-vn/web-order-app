import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER-ONLY — bypasses Row Level Security and
 * can administer auth.users. NEVER import this from a client component or any
 * file that ships to the browser; the key grants full database access.
 *
 * Used by the phone-auth flows (lib/auth/phone-actions.ts) to:
 *  - create auth users with email_confirm=true (synthetic emails never receive
 *    a confirmation mail, so normal signUp() would leave them unconfirmed),
 *  - reset a password via admin.updateUserById,
 *  - read/write phone_otp_pending (RLS-on, no policies → only service-role).
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (server env, not NEXT_PUBLIC_*).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set for phone auth."
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
