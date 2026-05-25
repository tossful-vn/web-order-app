/**
 * Loading skeleton for /account.
 * Renders instantly while Supabase fetches the user's saved_bowls list.
 * Layout intentionally matches the real page (header + 3-col card grid)
 * so the visual swap is jank-free.
 */
export default function AccountLoading() {
  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto w-full">
      <section>
        <div className="h-10 w-48 rounded bg-kale-100 animate-pulse mb-2" />
        <div className="h-4 w-80 rounded bg-kale-50 animate-pulse" />
      </section>
      <section>
        <div className="h-8 w-40 rounded bg-kale-50 animate-pulse mb-4" />
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="border border-kale-100 rounded-xl p-4 h-[180px]">
              <div className="h-5 w-3/4 rounded bg-kale-100 animate-pulse mb-3" />
              <div className="grid grid-cols-5 gap-2 mt-4">
                {Array.from({ length: 5 }).map((__, j) => (
                  <div
                    key={j}
                    className="h-14 rounded bg-kale-50 animate-pulse"
                  />
                ))}
              </div>
              <div className="h-3 w-20 rounded bg-kale-50 animate-pulse mt-4" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
