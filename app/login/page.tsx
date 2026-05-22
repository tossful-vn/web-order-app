import Link from "next/link";
import {
  signInWithPassword,
  signUp,
  requestPasswordReset,
} from "@/lib/auth/actions";

export const metadata = { title: "Đăng nhập · Tossful" };

type Mode = "login" | "signup" | "forgot";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { mode?: string; error?: string; sent?: string; reset?: string };
}) {
  const mode: Mode =
    searchParams.mode === "signup"
      ? "signup"
      : searchParams.mode === "forgot"
      ? "forgot"
      : "login";
  const error = searchParams.error;
  const sent = searchParams.sent === "1";
  const resetSuccess = searchParams.reset === "success";

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  const title =
    isSignup ? "Tạo tài khoản" : isForgot ? "Quên mật khẩu?" : "Đăng nhập";
  const subtitle =
    isSignup
      ? "Tạo tài khoản để lưu bowl và lên kế hoạch cho cả tuần."
      : isForgot
      ? "Nhập email của bạn — Tossful sẽ gửi link để đặt lại mật khẩu."
      : "Lưu salad của bạn và lên kế hoạch cho cả tuần.";
  const buttonLabel =
    isSignup ? "Tạo tài khoản" : isForgot ? "Gửi link đặt lại" : "Đăng nhập";

  const action = isSignup
    ? signUp
    : isForgot
    ? requestPasswordReset
    : signInWithPassword;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border border-kale-100 rounded-2xl p-8 shadow-sm">
        <h1 className="font-display text-3xl text-kale-700 mb-2">{title}</h1>
        <p className="text-sm text-kale-600 mb-6">{subtitle}</p>

        {resetSuccess && (
          <div className="mb-4 p-3 bg-kale-50 text-kale-700 rounded-lg text-sm">
            Đặt lại mật khẩu thành công. Đăng nhập bằng mật khẩu mới nhé.
          </div>
        )}
        {sent && isForgot && (
          <div className="mb-4 p-3 bg-kale-50 text-kale-700 rounded-lg text-sm">
            Đã gửi link đặt lại mật khẩu đến email của bạn. Kiểm tra hộp thư nhé.
          </div>
        )}
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
          {!isForgot && (
            <input
              name="password"
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              placeholder={
                isSignup ? "Mật khẩu (ít nhất 8 ký tự)" : "Mật khẩu"
              }
              className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
            />
          )}
          <button
            type="submit"
            className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
          >
            {buttonLabel}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-kale-600 space-y-2">
          {isLogin && (
            <>
              <div>
                <Link
                  href="/login?mode=forgot"
                  className="text-kale-700 underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div>
                Chưa có tài khoản?{" "}
                <Link
                  href="/login?mode=signup"
                  className="text-kale-700 underline"
                >
                  Tạo tài khoản mới
                </Link>
              </div>
            </>
          )}
          {isSignup && (
            <div>
              Đã có tài khoản?{" "}
              <Link href="/login" className="text-kale-700 underline">
                Đăng nhập
              </Link>
            </div>
          )}
          {isForgot && (
            <div>
              <Link href="/login" className="text-kale-700 underline">
                ← Quay lại đăng nhập
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
