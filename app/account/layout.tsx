import { requireUser } from "@/lib/auth/require-user";
import { getPreferredStore } from "@/lib/profile/preferred-store";
import AppShell from "@/lib/components/AppShell.client";

/**
 * Account layout — requires sign-in. Wraps page in shared AppShell.
 * The old "Saved bowls / Profile / Password" sub-nav is gone; Profile and
 * Password are accessible via the drawer.
 */
export default async function AccountLayout({
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
