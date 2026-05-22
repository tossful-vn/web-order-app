import Link from "next/link";
import { signInWithPassword, signUp } from "@/lib/auth/actions";

export const metadata = { title: "Dang nhap - Tossful" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { mode?: string; error?: string };
}) {
  const isSignup = searchParams.mode === "signup";
  const error = searchParams.error;
  const action = isSignup ? signUp : signInWithPassword;
  const title = isSignup ? "Tao tai khoan" : "Dang nhap";
  const buttonLabel = isSignup ? "Tao tai khoan" : "Dang nhap";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border border-kale-100 rounded-2xl p-8 shadow-sm">
        <h1 className="font-display text-3xl text-kale-700 mb-2">{title}</h1>
        <p className="text-sm text-kale-600 mb-6">
          {isSignup
            ? "Tao tai khoan de luu bowl va len ke hoach cho ca tuan."
            : "Luu salad cua ban va len ke hoach cho ca tuan."}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form action={action} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="email@cua-ban.com"
            className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
          />
          <input
            name="password"
            type="password"
            required
            minLength={isSignup ? 8 : undefined}
            placeholder={isSignup ? "Mat khau (it nhat 8 ky tu)" : "Mat khau"}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
          />
          <button
            type="submit"
            className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
          >
            {buttonLabel}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-kale-600">
          {isSignup ? (
            <>
              Da co tai khoan?{" "}
              <Link href="/login" className="text-kale-700 underline">
                Dang nhap
              </Link>
            </>
          ) : (
            <>
              Chua co tai khoan?{" "}
              <Link href="/login?mode=signup" className="text-kale-700 underline">
                Tao tai khoan moi
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
