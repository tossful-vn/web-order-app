import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";

/**
 * Public-friendly layout for /nutrition.
 * Adds the Tossful global header (matching /account) but does NOT require auth —
 * the calculator must work for guest visitors. Header adapts: shows email + logout
 * when signed in, or a "Dang nhap" link when not.
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

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="border-b border-kale-100 bg-white">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
          <Link href="/" className="font-display text-2xl text-kale-700">
            Tossful
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/byw" className="hover:text-kale-700">
              Tu&#7847;n c&#7911;a t&#244;i
            </Link>
            <Link href="/nutrition" className="text-kale-700 font-medium">
              M&#225;y t&#237;nh dinh d&#432;&#7905;ng
            </Link>
            {user ? (
              <>
                <span className="text-kale-400 hidden md:inline">{user.email}</span>
                <form action={signOut}>
                  <button className="text-kale-500 hover:text-kale-800 text-sm">
                    &#272;&#259;ng xu&#7845;t
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login?next=/nutrition"
                className="text-kale-700 hover:text-kale-800 font-medium"
              >
                &#272;&#259;ng nh&#7853;p
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
