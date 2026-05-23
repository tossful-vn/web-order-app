import { changePassword } from "@/lib/auth/actions";
import { getServerLang } from "@/lib/lang-server";

const STRINGS = {
  en: {
    metadata: "Change password · Tossful",
    title: "Change password",
    intro: "Confirm with your current password, then set a new one.",
    success: "Password changed successfully.",
    current_label: "Current password",
    new_label: "New password",
    new_note: "At least 8 characters.",
    confirm_label: "Confirm new password",
    submit: "Change password",
  },
  vi: {
    metadata: "Đổi mật khẩu · Tossful",
    title: "Đổi mật khẩu",
    intro: "Nhập mật khẩu hiện tại để xác nhận, rồi đặt mật khẩu mới.",
    success: "Đã đổi mật khẩu thành công.",
    current_label: "Mật khẩu hiện tại",
    new_label: "Mật khẩu mới",
    new_note: "Ít nhất 8 ký tự.",
    confirm_label: "Xác nhận mật khẩu mới",
    submit: "Đổi mật khẩu",
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

export default function ChangePasswordPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const s = STRINGS[getServerLang()];
  const success = searchParams.success === "1";
  const error = searchParams.error;

  return (
    <div className="max-w-lg space-y-8 p-6 mx-auto w-full">
      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-2">{s.title}</h1>
        <p className="text-kale-600">{s.intro}</p>
      </section>

      {success && (
        <div className="p-3 bg-kale-50 text-kale-700 rounded-lg text-sm">{s.success}</div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <form action={changePassword} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-kale-700 mb-1">{s.current_label}</label>
          <input
            name="current_password"
            type="password"
            required
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-kale-700 mb-1">{s.new_label}</label>
          <input
            name="new_password"
            type="password"
            required
            minLength={8}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
          <p className="text-xs text-kale-500 mt-1">{s.new_note}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-kale-700 mb-1">{s.confirm_label}</label>
          <input
            name="confirm_password"
            type="password"
            required
            minLength={8}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
        </div>

        <div className="pt-4">
          <button type="submit" className="bg-kale-700 text-white px-6 py-3 rounded-lg font-medium">
            {s.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
