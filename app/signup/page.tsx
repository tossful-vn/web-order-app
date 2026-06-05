import Link from "next/link";
import { requestSignupOtp, verifySignupOtp } from "@/lib/auth/phone-actions";
import { getServerLang } from "@/lib/lang-server";
import PasswordField from "@/lib/components/PasswordField.client";

const STRINGS = {
  en: {
    metadata: "Create account · Tossful",
    title: "Create account",
    sub1: "Sign up to save bowls and plan a whole week.",
    sub2: "Enter the code we sent to your Zalo, then set a password.",
    phone_ph: "Phone number (e.g. 0901234567)",
    name_ph: "Your name",
    email_ph: "Email (optional, for recovery)",
    otp_ph: "6-digit code",
    pwd_ph: "Password (≥ 8 characters)",
    pwd_confirm_ph: "Confirm password",
    btn1: "Send code",
    btn2: "Create account",
    otp_sent_to: "Code sent to",
    edit_phone: "← Change number",
    have_account_pre: "Already have an account?",
    signin_link: "Sign in",
    show: "Show password",
    hide: "Hide password",
  },
  vi: {
    metadata: "Tạo tài khoản · Tossful",
    title: "Tạo tài khoản",
    sub1: "Tạo tài khoản để lưu bowl và lên kế hoạch cho cả tuần.",
    sub2: "Nhập mã chúng tôi gửi qua Zalo, rồi đặt mật khẩu.",
    phone_ph: "Số điện thoại (ví dụ 0901234567)",
    name_ph: "Tên của bạn",
    email_ph: "Email (không bắt buộc, để khôi phục)",
    otp_ph: "Mã 6 số",
    pwd_ph: "Mật khẩu (ít nhất 8 ký tự)",
    pwd_confirm_ph: "Xác nhận mật khẩu",
    btn1: "Gửi mã",
    btn2: "Tạo tài khoản",
    otp_sent_to: "Đã gửi mã đến",
    edit_phone: "← Đổi số điện thoại",
    have_account_pre: "Đã có tài khoản?",
    signin_link: "Đăng nhập",
    show: "Hiện mật khẩu",
    hide: "Ẩn mật khẩu",
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

export default function SignupPage({
  searchParams,
}: {
  searchParams: {
    step?: string;
    error?: string;
    phone?: string;
    name?: string;
    email?: string;
    next?: string;
  };
}) {
  const s = STRINGS[getServerLang()];
  const isVerify = searchParams.step === "verify";
  const error = searchParams.error;
  const phone = searchParams.phone ?? "";
  const name = searchParams.name ?? "";
  const email = searchParams.email ?? "";
  const next = searchParams.next ?? "";

  const loginHref = "/login" + (next ? "?next=" + encodeURIComponent(next) : "");

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
          <p className="text-sm text-kale-600 mb-6">{isVerify ? s.sub2 : s.sub1}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {!isVerify ? (
            <form action={requestSignupOtp} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                required
                defaultValue={phone}
                placeholder={s.phone_ph}
                autoComplete="tel"
                className={inputCls}
              />
              <input
                name="display_name"
                type="text"
                required
                minLength={2}
                defaultValue={name}
                placeholder={s.name_ph}
                autoComplete="name"
                className={inputCls}
              />
              <input
                name="email"
                type="email"
                defaultValue={email}
                placeholder={s.email_ph}
                autoComplete="email"
                className={inputCls}
              />
              <button
                type="submit"
                className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
              >
                {s.btn1}
              </button>
            </form>
          ) : (
            <form action={verifySignupOtp} className="space-y-3">
              <input type="hidden" name="phone" value={phone} />
              <input type="hidden" name="display_name" value={name} />
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="next" value={next} />

              <div className="text-xs text-kale-500">
                {s.otp_sent_to} <span className="font-medium text-kale-700">{phone}</span>
              </div>
              <input
                name="otp"
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                placeholder={s.otp_ph}
                autoComplete="one-time-code"
                className={inputCls}
              />
              <PasswordField
                name="password"
                required
                minLength={8}
                placeholder={s.pwd_ph}
                autoComplete="new-password"
                showLabel={s.show}
                hideLabel={s.hide}
              />
              <PasswordField
                name="confirm_password"
                required
                minLength={8}
                placeholder={s.pwd_confirm_ph}
                autoComplete="new-password"
                showLabel={s.show}
                hideLabel={s.hide}
              />
              <button
                type="submit"
                className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
              >
                {s.btn2}
              </button>
              <div className="text-center">
                <Link
                  href={"/signup" + (next ? "?next=" + encodeURIComponent(next) : "")}
                  className="text-xs text-kale-600 underline"
                >
                  {s.edit_phone}
                </Link>
              </div>
            </form>
          )}

          <div className="mt-5 text-center text-sm text-kale-600">
            {s.have_account_pre}{" "}
            <Link href={loginHref} className="text-kale-700 underline">
              {s.signin_link}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
