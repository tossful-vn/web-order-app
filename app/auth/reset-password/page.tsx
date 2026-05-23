import { setNewPassword } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/require-user";
import { getServerLang } from "@/lib/lang-server";

const STRINGS = {
  en: {
    metadata: "Reset password · Tossful",
    title: "Reset password",
    intro: "Set a new password for your Tossful account.",
    new_ph: "New password (≥ 8 characters)",
    confirm_ph: "Confirm new password",
    save: "Save new password",
  },
  vi: {
    metadata: "Đặt lại mật khẩu · Tossful",
    title: "Đặt lại mật khẩu",
    intro: "Đặt mật khẩu mới cho tài khoản Tossful của bạn.",
    new_ph: "Mật khẩu mới (ít nhất 8 ký tự)",
    confirm_ph: "Xác nhận mật khẩu mới",
    save: "Lưu mật khẩu mới",
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireUser("/login");
  const s = STRINGS[getServerLang()];
  const error = searchParams.error;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border border-kale-100 rounded-2xl p-8 shadow-sm">
        <h1 className="font-display text-3xl text-kale-700 mb-2">{s.title}</h1>
        <p className="text-sm text-kale-600 mb-6">{s.intro}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form action={setNewPassword} className="space-y-3">
          <input
            name="new_password"
            type="password"
            required
            minLength={8}
            placeholder={s.new_ph}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
          />
          <input
            name="confirm_password"
            type="password"
            required
            minLength={8}
            placeholder={s.confirm_ph}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
          />
          <button
            type="submit"
            className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
          >
            {s.save}
          </button>
        </form>
      </div>
    </main>
  );
}
