/**
 * Loading skeleton for /byw (My Week / Build Your Week).
 * Shown while server queries (week_items + saved_bowls + addons + signatures) resolve.
 * Mimics the day-card grid so the transition feels stable.
 */
export default function BywLoading() {
  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-10 w-40 rounded bg-kale-100 animate-pulse mb-2" />
          <div className="h-4 w-64 rounded bg-kale-50 animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded bg-kale-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="border border-kale-100 rounded-xl p-4 h-[220px]"
          >
            <div className="h-5 w-20 rounded bg-kale-100 animate-pulse mb-3" />
            <div className="space-y-2 mt-4">
              <div className="h-4 rounded bg-kale-50 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-kale-50 animate-pulse" />
              <div className="h-4 w-4/6 rounded bg-kale-50 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
