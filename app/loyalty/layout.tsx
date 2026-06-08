import { requireUser } from "@/lib/auth/require-user";
import { getPreferredStore } from "@/lib/profile/preferred-store";
import AppShell from "@/lib/components/AppShell.client";

/**
 * Loyalty layout — requires sign-in. Wraps page in shared AppShell so the
 * top nav (Calculator / My week / Saved bowls / Loyalty) and drawer menu
 * stay consistent across the app.
 */
export default async function LoyaltyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const preferredStore = await getPreferredStore(user.id);
  return (
    <AppShell user={{ email: user.email }} preferredStore={preferredStore}>
      {children}
    </AppShell>
  );
}
