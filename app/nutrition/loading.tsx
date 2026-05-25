/**
 * Loading skeleton for /nutrition (Calculator).
 * Shown briefly while Calculator.client.tsx hydrates and its initial Supabase
 * fetches (items + nutrition + recipes) complete.
 */
export default function NutritionLoading() {
  return (
    <div className="tossful-calc">
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        <div>
          <div className="h-10 w-72 rounded bg-kale-100 animate-pulse mb-2" />
          <div className="h-4 w-96 rounded bg-kale-50 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-kale-100 rounded-xl h-[170px] bg-kale-50 animate-pulse"
                />
              ))}
            </div>
          </div>
          <aside className="border border-kale-100 rounded-xl p-4 h-fit space-y-3">
            <div className="h-5 w-32 rounded bg-kale-100 animate-pulse" />
            <div className="grid grid-cols-5 gap-2 mt-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-14 rounded bg-kale-50 animate-pulse" />
              ))}
            </div>
            <div className="h-10 w-full rounded bg-kale-100 animate-pulse mt-4" />
          </aside>
        </div>
      </div>
    </div>
  );
}
