import { setNewPassword } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/require-user";

export const metadata = { title: "Đặt lại mật khẩu · Tossful" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  // requireUser ensures the user landed here via the recovery callback
  // (they have a short-lived session). Otherwise redirect them to /login.
  await requireUser("/login");
  const error = searchParams.error;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border border-kale-100 rounded-2xl p-8 shadow-sm">
        <h1 className="font-display text-3xl text-kale-700 mb-2">
          Đặt lại mật khẩu
        </h1>
        <p className="text-sm text-kale-600 mb-6">
          Đặt mật khẩu mới cho tài khoản Tossful của bạn.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form action={setNewPassword} className="space-y-3">
          <input
            name="new_password"
            type="password"
            required
            minLength={8}
            placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
            className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
          />
          <input
            name="confirm_password"
            type="password"
            required
            minLength={8}
            placeholder="Xác nhận mật khẩu mới"
            className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
          />
          <button
            type="submit"
            className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
          >
            Lưu mật khẩu mới
          </button>
        </form>
      </div>
    </main>
  );
}
