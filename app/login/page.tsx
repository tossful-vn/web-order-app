import Link from "next/link";
import { signInWithPhone } from "@/lib/auth/phone-actions";
import { getServerLang } from "@/lib/lang-server";
import PasswordField from "@/lib/components/PasswordField.client";

const STRINGS = {
  en: {
    metadata: "Sign in · Tossful",
    title: "Welcome back",
    sub: "Save your salads and plan your week.",
    phone_ph: "Phone number (e.g. 0901234567)",
    pwd: "Password",
    btn: "Sign in",
    forgot_link: "Forgot password?",
    no_account_pre: "No account yet?",
    create_one: "Create one",
    reset_success: "Password reset successful. Sign in with your new password.",
    show: "Show password",
    hide: "Hide password",
  },
  vi: {
    metadata: "Đăng nhập · Tossful",
    title: "Đăng nhập",
    sub: "Lưu salad của bạn và lên kế hoạch cho cả tuần.",
    phone_ph: "Số điện thoại (ví dụ 0901234567)",
    pwd: "Mật khẩu",
    btn: "Đăng nhập",
    forgot_link: "Quên mật khẩu?",
    no_account_pre: "Chưa có tài khoản?",
    create_one: "Tạo tài khoản mới",
    reset_success: "Đặt lại mật khẩu thành công. Đăng nhập bằng mật khẩu mới nhé.",
    show: "Hiện mật khẩu",
    hide: "Ẩn mật khẩu",
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string; reset?: string };
}) {
  const s = STRINGS[getServerLang()];
  const error = searchParams.error;
  const next = searchParams.next ?? "";
  const resetSuccess = searchParams.reset === "success";

  const signupHref = "/signup" + (next ? "?next=" + encodeURIComponent(next) : "");
  const resetHref =
    "/reset-password" + (next ? "?next=" + encodeURIComponent(next) : "");

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
        <img
          src="/brand/tossful-mascot.png"
          alt=""
          aria-hidden="true"
          className="w-40 sm:w-[280px] h-auto shrink-0 select-none"
        />
        <div className="w-full max-w-sm bg-white border border-kale-100 rounded-2xl p-8 shadow-sm">
          <h1 className="font-display text-3xl text-kale-700 mb-2">{s.title}</h1>
          <p className="text-sm text-kale-600 mb-6">{s.sub}</p>

          {resetSuccess && (
            <div className="mb-4 p-3 bg-kale-50 text-kale-700 rounded-lg text-sm">
              {s.reset_success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <form action={signInWithPhone} className="space-y-3">
            <input type="hidden" name="next" value={next} />
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              required
              placeholder={s.phone_ph}
              autoComplete="tel"
              className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
            />
            <PasswordField
              name="password"
              required
              placeholder={s.pwd}
              autoComplete="current-password"
              showLabel={s.show}
              hideLabel={s.hide}
            />
            <button
              type="submit"
              className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
            >
              {s.btn}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-kale-600 space-y-2">
            <div>
              <Link href={resetHref} className="text-kale-700 underline">
                {s.forgot_link}
              </Link>
            </div>
            <div>
              {s.no_account_pre}{" "}
              <Link href={signupHref} className="text-kale-700 underline">
                {s.create_one}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
