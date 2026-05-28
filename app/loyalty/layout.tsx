import { requireUser } from "@/lib/auth/require-user";
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
  return <AppShell user={{ email: user.email }}>{children}</AppShell>;
}
