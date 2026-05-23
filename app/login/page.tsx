import Link from "next/link";
import {
  signInWithPassword,
  signUp,
  requestPasswordReset,
} from "@/lib/auth/actions";
import { getServerLang } from "@/lib/lang-server";
import PasswordField from "./PasswordField.client";

const STRINGS = {
  en: {
    metadata: "Sign in · Tossful",
    title_login: "Welcome back",
    title_signup: "Create account",
    title_forgot: "Forgot password?",
    sub_login: "Save your salads and plan your week.",
    sub_signup: "Sign up to save bowls and plan a whole week.",
    sub_forgot: "Enter your email — Tossful will send a reset link.",
    btn_login: "Sign in",
    btn_signup: "Create account",
    btn_forgot: "Send reset link",
    email_ph: "email@yours.com",
    pwd_min8: "Password (≥ 8 characters)",
    pwd: "Password",
    forgot_link: "Forgot password?",
    no_account_pre: "No account yet?",
    create_one: "Create one",
    have_account_pre: "Already have an account?",
    signin_link: "Sign in",
    back_to_login: "← Back to sign in",
    reset_success: "Password reset successful. Sign in with your new password.",
    reset_sent: "Reset link sent to your email. Check your inbox.",
    show: "Show password",
    hide: "Hide password",
  },
  vi: {
    metadata: "Đăng nhập · Tossful",
    title_login: "Đăng nhập",
    title_signup: "Tạo tài khoản",
    title_forgot: "Quên mật khẩu?",
    sub_login: "Lưu salad của bạn và lên kế hoạch cho cả tuần.",
    sub_signup: "Tạo tài khoản để lưu bowl và lên kế hoạch cho cả tuần.",
    sub_forgot: "Nhập email của bạn — Tossful sẽ gửi link để đặt lại mật khẩu.",
    btn_login: "Đăng nhập",
    btn_signup: "Tạo tài khoản",
    btn_forgot: "Gửi link đặt lại",
    email_ph: "email@cua-ban.com",
    pwd_min8: "Mật khẩu (ít nhất 8 ký tự)",
    pwd: "Mật khẩu",
    forgot_link: "Quên mật khẩu?",
    no_account_pre: "Chưa có tài khoản?",
    create_one: "Tạo tài khoản mới",
    have_account_pre: "Đã có tài khoản?",
    signin_link: "Đăng nhập",
    back_to_login: "← Quay lại đăng nhập",
    reset_success: "Đặt lại mật khẩu thành công. Đăng nhập bằng mật khẩu mới nhé.",
    reset_sent: "Đã gửi link đặt lại mật khẩu đến email của bạn. Kiểm tra hộp thư nhé.",
    show: "Hiện mật khẩu",
    hide: "Ẩn mật khẩu",
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

type Mode = "login" | "signup" | "forgot";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { mode?: string; error?: string; sent?: string; reset?: string };
}) {
  const lang = getServerLang();
  const s = STRINGS[lang];

  const mode: Mode =
    searchParams.mode === "signup" ? "signup"
    : searchParams.mode === "forgot" ? "forgot"
    : "login";
  const error = searchParams.error;
  const sent = searchParams.sent === "1";
  const resetSuccess = searchParams.reset === "success";

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  const title = isSignup ? s.title_signup : isForgot ? s.title_forgot : s.title_login;
  const subtitle = isSignup ? s.sub_signup : isForgot ? s.sub_forgot : s.sub_login;
  const buttonLabel = isSignup ? s.btn_signup : isForgot ? s.btn_forgot : s.btn_login;

  const action = isSignup ? signUp : isForgot ? requestPasswordReset : signInWithPassword;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border border-kale-100 rounded-2xl p-8 shadow-sm">
        <h1 className="font-display text-3xl text-kale-700 mb-2">{title}</h1>
        <p className="text-sm text-kale-600 mb-6">{subtitle}</p>

        {resetSuccess && (
          <div className="mb-4 p-3 bg-kale-50 text-kale-700 rounded-lg text-sm">{s.reset_success}</div>
        )}
        {sent && isForgot && (
          <div className="mb-4 p-3 bg-kale-50 text-kale-700 rounded-lg text-sm">{s.reset_sent}</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form action={action} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder={s.email_ph}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
          />
          {!isForgot && (
            <PasswordField
              name="password"
              required
              minLength={isSignup ? 8 : undefined}
              placeholder={isSignup ? s.pwd_min8 : s.pwd}
              autoComplete={isSignup ? "new-password" : "current-password"}
              showLabel={s.show}
              hideLabel={s.hide}
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
                <Link href="/login?mode=forgot" className="text-kale-700 underline">
                  {s.forgot_link}
                </Link>
              </div>
              <div>
                {s.no_account_pre}{" "}
                <Link href="/login?mode=signup" className="text-kale-700 underline">
                  {s.create_one}
                </Link>
              </div>
            </>
          )}
          {isSignup && (
            <div>
              {s.have_account_pre}{" "}
              <Link href="/login" className="text-kale-700 underline">{s.signin_link}</Link>
            </div>
          )}
          {isForgot && (
            <div>
              <Link href="/login" className="text-kale-700 underline">{s.back_to_login}</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
