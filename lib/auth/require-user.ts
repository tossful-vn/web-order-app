import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Use inside Server Components / Route Handlers that require a logged-in
 * user. Redirects to /login if there isn't one, otherwise returns the user.
 */
export async function requireUser(redirectTo: string = "/login") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(redirectTo);
  return user;
}
