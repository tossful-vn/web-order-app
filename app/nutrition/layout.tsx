import { createClient } from "@/lib/supabase/server";
import MvpShell from "./MvpShell.client";

/**
 * Minimal, anonymous-first layout for /nutrition (TSK-169, Option C).
 *
 * Wraps the page in MvpShell (brand logo + EN/VI toggle + Beacons footer) —
 * NOT AppShell. There is no auth wall: the calculator works for guests. We
 * still resolve the Supabase session so the cookie is refreshed and downstream
 * client code can branch on logged-in vs anonymous, but no auth UI is rendered.
 * AppShell stays in place for /account, /byw, /loyalty.
 */
export default async function NutritionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Touch the session so @supabase/ssr refreshes the auth cookie on navigation.
  const supabase = createClient();
  await supabase.auth.getUser();

  return <MvpShell>{children}</MvpShell>;
}
