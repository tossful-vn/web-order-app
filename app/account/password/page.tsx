import { changePassword } from "@/lib/auth/actions";

export const metadata = { title: "Đổi mật khẩu · Tossful" };

export default function ChangePasswordPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const success = searchParams.success === "1";
  const error = searchParams.error;

  return (
    <div className="max-w-lg space-y-8">
      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-2">
          Đổi mật khẩu
        </h1>
        <p className="text-kale-600">
          Nhập mật khẩu hiện tại để xác nhận, rồi đặt mật khẩu mới.
        </p>
      </section>

      {success && (
        <div className="p-3 bg-kale-50 text-kale-700 rounded-lg text-sm">
          Đã đổi mật khẩu thành công.
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form action={changePassword} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-kale-700 mb-1">
            Mật khẩu hiện tại
          </label>
          <input
            name="current_password"
            type="password"
            required
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-kale-700 mb-1">
            Mật khẩu mới
          </label>
          <input
            name="new_password"
            type="password"
            required
            minLength={8}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
          <p className="text-xs text-kale-500 mt-1">Ít nhất 8 ký tự.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-kale-700 mb-1">
            Xác nhận mật khẩu mới
          </label>
          <input
            name="confirm_password"
            type="password"
            required
            minLength={8}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="bg-kale-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Đổi mật khẩu
          </button>
        </div>
      </form>
    </div>
  );
}
