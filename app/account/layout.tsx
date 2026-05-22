import { requireUser } from "@/lib/auth/require-user";
import { signOut } from "@/lib/auth/actions";
import Link from "next/link";

/**
 * Auth-required wrapper for /account/*.
 * requireUser() redirects to /login if no session.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-kale-100">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
          <Link href="/" className="font-display text-2xl text-kale-700">
            Tossful
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/byw" className="hover:text-kale-700">
              Tuần của tôi
            </Link>
            <Link href="/nutrition" className="hover:text-kale-700">
              Máy tính dinh dưỡng
            </Link>
            <span className="text-kale-400 hidden md:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <button className="text-kale-500 hover:text-kale-800 text-sm">
                Đăng xuất
              </button>
            </form>
          </nav>
        </div>

        <div className="px-6 max-w-5xl mx-auto w-full">
          <nav className="flex gap-6 text-sm border-b-0">
            <Link
              href="/account"
              className="py-3 border-b-2 border-transparent hover:border-kale-300 text-kale-700"
            >
              Bowl đã lưu
            </Link>
            <Link
              href="/account/profile"
              className="py-3 border-b-2 border-transparent hover:border-kale-300 text-kale-700"
            >
              Hồ sơ
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</main>
    </div>
  );
}
