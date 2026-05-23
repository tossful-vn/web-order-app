import { createClient } from "@/lib/supabase/server";
import AppShell from "@/lib/components/AppShell.client";

export default async function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userObj = user ? { email: user.email } : null;
  return <AppShell user={userObj}>{children}</AppShell>;
}
