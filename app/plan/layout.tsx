import { requireUser } from "@/lib/auth/require-user";
import { getPreferredStore } from "@/lib/profile/preferred-store";
import AppShell from "@/lib/components/AppShell.client";

// Auth gate for the /plan planner (TSK-118). Mirrors /byw/layout: guests are
// bounced to login (with a return path), everyone else gets the app chrome.
export default async function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/login?next=/plan");
  const preferredStore = await getPreferredStore(user.id);
  return (
    <AppShell user={{ email: user.email }} preferredStore={preferredStore}>
      {children}
    </AppShell>
  );
}
