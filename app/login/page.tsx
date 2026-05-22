import { signInWithEmail, signInWithGoogle } from "@/lib/auth/actions";

export const metadata = { title: "Đăng nhập · Tossful" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { sent?: string; error?: string };
}) {
  const sent = searchParams.sent === "1";
  const error = searchParams.error;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border border-kale-100 rounded-2xl p-8 shadow-sm">
        <h1 className="font-display text-3xl text-kale-700 mb-2">Đăng nhập</h1>
        <p className="text-sm text-kale-600 mb-6">
          Lưu salad của bạn và lên kế hoạch cho cả tuần.
        </p>

        {sent && (
          <div className="mb-4 p-3 bg-kale-50 text-kale-700 rounded-lg text-sm">
            Đã gửi link đăng nhập đến email của bạn. Kiểm tra hộp thư nhé.
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            const res = await signInWithEmail(formData);
            const params = res?.error
              ? `?error=${encodeURIComponent(res.error)}`
              : "?sent=1";
            const { redirect } = await import("next/navigation");
            redirect(`/login${params}`);
          }}
          className="space-y-3"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="email@cua-ban.com"
            className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
          />
          <button
            type="submit"
            className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
          >
            Gửi link đăng nhập
          </button>
        </form>

        <div className="flex items-center my-5 text-xs text-kale-400">
          <span className="flex-1 border-t border-kale-100" />
          <span className="px-3">hoặc</span>
          <span className="flex-1 border-t border-kale-100" />
        </div>

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full border border-kale-200 py-3 rounded-lg font-medium hover:bg-kale-50 transition"
          >
            Tiếp tục với Google
          </button>
        </form>
      </div>
    </main>
  );
}
