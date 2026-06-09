import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Auth callback.
 * Handles both:
 *   - magic link click (?code=...)
 *   - Google OAuth return (?code=...)
 *
 * On success → /account
 * On failure → /login?error=...
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  // Password-recovery links land here too (TSK-144). On any failure send the
  // user to /reset-password's expired state instead of a generic login error.
  const isReset = next.startsWith("/reset-password");
  const failUrl = isReset
    ? `${origin}/reset-password?expired=1`
    : `${origin}/login?error=missing_code`;

  if (!code) {
    return NextResponse.redirect(failUrl);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      isReset
        ? `${origin}/reset-password?expired=1`
        : `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
