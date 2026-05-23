import { requireUser } from "@/lib/auth/require-user";
import AppShell from "@/lib/components/AppShell.client";

export default async function BywLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return <AppShell user={{ email: user.email }}>{children}</AppShell>;
}
