import { requireUser } from "@/lib/auth/require-user";
import { getPreferredStore } from "@/lib/profile/preferred-store";
import AppShell from "@/lib/components/AppShell.client";

export default async function BywLayout({
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
