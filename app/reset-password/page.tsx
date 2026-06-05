import Link from "next/link";
import { requestResetOtp, verifyResetOtp } from "@/lib/auth/phone-actions";
import { getServerLang } from "@/lib/lang-server";
import PasswordField from "@/lib/components/PasswordField.client";

const STRINGS = {
  en: {
    metadata: "Reset password · Tossful",
    title: "Reset password",
    sub1: "Enter your phone number — we'll send a verification code to your Zalo.",
    sub2: "Enter the code, then choose a new password.",
    phone_ph: "Phone number (e.g. 0901234567)",
    otp_ph: "6-digit code",
    pwd_ph: "New password (≥ 8 characters)",
    pwd_confirm_ph: "Confirm new password",
    btn1: "Send code",
    btn2: "Set new password",
    otp_sent_to: "Code sent to",
    edit_phone: "← Change number",
    back_to_login: "← Back to sign in",
    show: "Show password",
    hide: "Hide password",
  },
  vi: {
    metadata: "Đặt lại mật khẩu · Tossful",
    title: "Đặt lại mật khẩu",
    sub1: "Nhập số điện thoại — chúng tôi sẽ gửi mã xác minh qua Zalo.",
    sub2: "Nhập mã, rồi chọn mật khẩu mới.",
    phone_ph: "Số điện thoại (ví dụ 0901234567)",
    otp_ph: "Mã 6 số",
    pwd_ph: "Mật khẩu mới (ít nhất 8 ký tự)",
    pwd_confirm_ph: "Xác nhận mật khẩu mới",
    btn1: "Gửi mã",
    btn2: "Đặt mật khẩu mới",
    otp_sent_to: "Đã gửi mã đến",
    edit_phone: "← Đổi số điện thoại",
    back_to_login: "← Quay lại đăng nhập",
    show: "Hiện mật khẩu",
    hide: "Ẩn mật khẩu",
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { step?: string; error?: string; phone?: string };
}) {
  const s = STRINGS[getServerLang()];
  const isVerify = searchParams.step === "verify";
  const error = searchParams.error;
  const phone = searchParams.phone ?? "";

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
            <form action={requestResetOtp} className="space-y-3">
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
              <button
                type="submit"
                className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
              >
                {s.btn1}
              </button>
            </form>
          ) : (
            <form action={verifyResetOtp} className="space-y-3">
              <input type="hidden" name="phone" value={phone} />
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
                <Link href="/reset-password" className="text-xs text-kale-600 underline">
                  {s.edit_phone}
                </Link>
              </div>
            </form>
          )}

          <div className="mt-5 text-center text-sm text-kale-600">
            <Link href="/login" className="text-kale-700 underline">
              {s.back_to_login}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
