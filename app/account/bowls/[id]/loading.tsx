/**
 * Loading skeleton for /account/bowls/[id] — the saved-bowl detail page.
 * Mimics the back link + title + macro panel + ingredients list so the
 * transition from /account is visually stable.
 */
export default function BowlDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 w-full">
      <div className="h-4 w-40 rounded bg-kale-50 animate-pulse" />
      <div>
        <div className="h-9 w-2/3 rounded bg-kale-100 animate-pulse mb-2" />
        <div className="h-4 w-32 rounded bg-kale-50 animate-pulse" />
      </div>
      <div className="border border-kale-100 rounded-xl p-4">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="h-16 rounded bg-kale-50 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-6 w-32 rounded bg-kale-100 animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-kale-50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
