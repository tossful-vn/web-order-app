import { createClient } from "@/lib/supabase/server";
import { getPreferredStore } from "@/lib/profile/preferred-store";
import AppShell from "@/lib/components/AppShell.client";

export default async function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userObj = user ? { email: user.email } : null;
  const preferredStore = user ? await getPreferredStore(user.id) : null;
  return (
    <AppShell user={userObj} preferredStore={preferredStore}>
      {children}
    </AppShell>
  );
}
