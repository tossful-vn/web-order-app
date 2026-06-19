import { createClient } from "@/lib/supabase/server";
import { getPreferredStore } from "@/lib/profile/preferred-store";
import AppShell from "@/lib/components/AppShell.client";
import MvpShell from "./MvpShell.client";

/**
 * /nutrition shell selection (TSK-174 builds on TSK-169, Option C).
 *
 * ANONYMOUS visitors keep the minimal, anonymous-first MvpShell (brand logo +
 * EN/VI toggle + Beacons footer, NO nav) — this is the shareable marketing /
 * SEO surface linked from beacons.ai/tossful, and it must stay untouched.
 *
 * LOGGED-IN visitors instead get the full AppShell: the app header/nav (so they
 * can exit the calculator back into /account, /byw, /loyalty or home) plus the
 * "Lá" chatbot. AppShell already hides Lá on the brand-site proxy
 * (?src=brand-site), so that surface stays Lá-free.
 *
 * Auth is resolved the same way every AppShell layout does it (Supabase
 * getUser + getPreferredStore), which also refreshes the @supabase/ssr cookie.
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

  if (!user) {
    // Anonymous: unchanged TSK-169 marketing surface.
    return <MvpShell>{children}</MvpShell>;
  }

  const preferredStore = await getPreferredStore(user.id);
  return (
    <AppShell user={{ email: user.email }} preferredStore={preferredStore}>
      {children}
    </AppShell>
  );
}
