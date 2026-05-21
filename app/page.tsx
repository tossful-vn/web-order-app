export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <h1 className="font-display text-6xl text-kale-700 mb-3 tracking-tight">
          Tossful
        </h1>
        <p className="text-2xl text-kale-600 mb-6 font-display italic">
          Salad đặt online
        </p>
        <div className="inline-block bg-kale-100 text-kale-700 px-4 py-2 rounded-full text-sm">
          Đang xây dựng — sắp khai trương
        </div>
        <p className="text-xs text-kale-500 mt-8">
          Web order skeleton · Phase 1 · {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
