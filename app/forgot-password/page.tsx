import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
import { getServerLang } from "@/lib/lang-server";

const STRINGS = {
  en: {
    metadata: "Forgot password · Tossful",
    title: "Forgot password",
    note: "Enter your registered email to receive a password reset link.",
    email_label: "Your email",
    email_ph: "name@example.com",
    btn: "Send reset link",
    sent: "If this email has an account, we've sent a password reset link. Check your inbox (including the spam folder).",
    needs_email:
      "An email is required to reset your password. If you signed up with a phone number, contact Tossful for help.",
    email_required: "Please enter your email.",
    back: "← Back to sign in",
  },
  vi: {
    metadata: "Quên mật khẩu · Tossful",
    title: "Quên mật khẩu",
    note: "Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.",
    email_label: "Email của bạn",
    email_ph: "name@example.com",
    btn: "Gửi liên kết đặt lại",
    sent: "Nếu email này có tài khoản, chúng tôi đã gửi liên kết đặt lại mật khẩu. Kiểm tra hộp thư (cả mục spam).",
    needs_email:
      "Cần email để đặt lại mật khẩu. Nếu bạn đăng ký bằng số điện thoại, liên hệ Tossful để được hỗ trợ.",
    email_required: "Vui lòng nhập email.",
    back: "← Quay lại đăng nhập",
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { id?: string; sent?: string; error?: string; needsEmail?: string };
}) {
  const s = STRINGS[getServerLang()];
  const sent = searchParams.sent === "1";
  const id = searchParams.id ?? "";
  const idIsEmail = id.includes("@");
  // Explicit flag from the action, or an identifier that's clearly a phone.
  const needsEmail = searchParams.needsEmail === "1" || (!!id && !idIsEmail);
  const errorMsg =
    searchParams.error === "email_required" ? s.email_required : null;

  const inputCls =
    "w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500";

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

          {sent ? (
            <div className="mb-2 p-3 bg-kale-50 text-kale-700 rounded-lg text-sm">
              {s.sent}
            </div>
          ) : (
            <>
              <p className="text-sm text-kale-600 mb-6">{s.note}</p>

              {needsEmail && (
                <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
                  {s.needs_email}
                </div>
              )}
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {errorMsg}
                </div>
              )}

              <form action={requestPasswordReset} className="space-y-3">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-kale-700 mb-1"
                >
                  {s.email_label}
                </label>
                {/* type=text (not email) so a phone typed here still reaches the
                    server, which shows the localized "cần email" message rather
                    than the browser's generic "include an @" tooltip. */}
                <input
                  id="email"
                  name="email"
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  defaultValue={idIsEmail ? id : ""}
                  placeholder={s.email_ph}
                  autoComplete="email"
                  className={inputCls}
                />
                <button
                  type="submit"
                  className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
                >
                  {s.btn}
                </button>
              </form>
            </>
          )}

          <div className="mt-5 text-center text-sm text-kale-600">
            <Link href="/login" className="text-kale-700 underline">
              {s.back}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
