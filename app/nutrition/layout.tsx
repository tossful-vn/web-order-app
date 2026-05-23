import { createClient } from "@/lib/supabase/server";
import AppShell from "@/lib/components/AppShell.client";

/**
 * Public-friendly layout for /nutrition. Wraps page in the shared AppShell
 * (one-row header + drawer). Does not require auth — calculator must work
 * for guest visitors.
 */
export default async function NutritionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userObj = user ? { email: user.email } : null;

  return <AppShell user={userObj}>{children}</AppShell>;
}
