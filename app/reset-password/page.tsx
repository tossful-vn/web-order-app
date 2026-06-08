import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/lang-server";
import ResetPasswordForm from "./ResetPasswordForm.client";

const STRINGS = {
  en: {
    metadata: "Reset password · Tossful",
    title: "Reset password",
    intro: "Set a new password for your Tossful account.",
    new_ph: "New password (≥ 8 characters)",
    confirm_ph: "Confirm new password",
    save: "Save new password",
    show: "Show password",
    hide: "Hide password",
    too_short: "Password must be at least 8 characters.",
    mismatch: "Passwords don't match.",
    update_failed: "Couldn't update your password. Please try again.",
    expired_title: "Link expired",
    expired: "This link has expired or is invalid. Request a new one.",
    request_new: "Request a new link",
    back: "← Back to sign in",
  },
  vi: {
    metadata: "Đặt lại mật khẩu · Tossful",
    title: "Đặt lại mật khẩu",
    intro: "Đặt mật khẩu mới cho tài khoản Tossful của bạn.",
    new_ph: "Mật khẩu mới (ít nhất 8 ký tự)",
    confirm_ph: "Nhập lại mật khẩu mới",
    save: "Lưu mật khẩu mới",
    show: "Hiện mật khẩu",
    hide: "Ẩn mật khẩu",
    too_short: "Mật khẩu tối thiểu 8 ký tự.",
    mismatch: "Mật khẩu xác nhận không khớp.",
    update_failed: "Không cập nhật được mật khẩu. Vui lòng thử lại.",
    expired_title: "Liên kết đã hết hạn",
    expired: "Liên kết đã hết hạn hoặc không hợp lệ. Yêu cầu liên kết mới.",
    request_new: "Yêu cầu liên kết mới",
    back: "← Quay lại đăng nhập",
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; expired?: string };
}) {
  const s = STRINGS[getServerLang()];

  // The recovery session is established by /auth/callback after the email link.
  // No session (or an explicit expired flag) => the link was invalid/expired.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isExpired = searchParams.expired === "1" || !user;

  const updateFailed = searchParams.error === "update_failed";

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
          {isExpired ? (
            <>
              <h1 className="font-display text-3xl text-kale-700 mb-2">
                {s.expired_title}
              </h1>
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {s.expired}
              </div>
              <Link
                href="/forgot-password"
                className="block w-full text-center bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
              >
                {s.request_new}
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl text-kale-700 mb-2">{s.title}</h1>
              <p className="text-sm text-kale-600 mb-6">{s.intro}</p>

              {updateFailed && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {s.update_failed}
                </div>
              )}

              <ResetPasswordForm
                newPh={s.new_ph}
                confirmPh={s.confirm_ph}
                save={s.save}
                show={s.show}
                hide={s.hide}
                tooShort={s.too_short}
                mismatch={s.mismatch}
              />
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
