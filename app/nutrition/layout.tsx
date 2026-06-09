import { createClient } from "@/lib/supabase/server";
import { getPreferredStore } from "@/lib/profile/preferred-store";
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
  const preferredStore = user ? await getPreferredStore(user.id) : null;

  return (
    <AppShell user={userObj} preferredStore={preferredStore}>
      {children}
    </AppShell>
  );
}
