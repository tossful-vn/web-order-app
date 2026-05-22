import Link from "next/link";

export const metadata = { title: "Đã nhận yêu cầu · Tossful" };

export default function ThanksPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">🥗</div>
        <h1 className="font-display text-3xl text-kale-700 mb-3">
          Cảm ơn bạn
        </h1>
        <p className="text-kale-600 mb-6">
          Tossful đã nhận yêu cầu đặt trước. Đội của TA sẽ nhắn lại trong vòng
          24h để xác nhận thời gian và hướng dẫn thanh toán.
        </p>
        <Link
          href="/account"
          className="inline-block bg-kale-700 text-white px-5 py-3 rounded-lg"
        >
          Về trang tài khoản
        </Link>
      </div>
    </main>
  );
}
