import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-kale-100">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
          <Link href="/" className="font-display text-2xl text-kale-700">
            Tossful
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link
              href="/nutrition"
              className="text-kale-600 hover:text-kale-800"
            >
              Máy tính dinh dưỡng
            </Link>
            {user ? (
              <Link
                href="/account"
                className="bg-kale-700 text-white px-4 py-2 rounded-lg hover:bg-kale-800 transition"
              >
                Tài khoản
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-kale-700 text-white px-4 py-2 rounded-lg hover:bg-kale-800 transition"
              >
                Đăng nhập
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-xl text-center">
          <h1 className="font-display text-6xl text-kale-700 mb-3 tracking-tight">
            Tossful
          </h1>
          <p className="text-2xl text-kale-600 mb-6 font-display italic">
            Salad đặt online
          </p>
          <div className="inline-block bg-kale-100 text-kale-700 px-4 py-2 rounded-full text-sm">
            Đang xây dựng — sắp khai trương
          </div>
          <p className="text-xs text-kale-500 mt-8">
            Web order · Phase 2 · {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  );
}
