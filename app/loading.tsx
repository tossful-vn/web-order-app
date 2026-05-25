/**
 * Root-level loading skeleton — shown when navigating to / (homepage).
 * Tiny because / is a near-static landing page; the skeleton just keeps the
 * shell stable while supabase.auth.getUser() resolves.
 */
export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-kale-100">
        <div className="px-6 py-4 max-w-5xl mx-auto w-full h-[60px]" />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-xl text-center space-y-4 w-full">
          <div className="h-12 w-40 mx-auto rounded bg-kale-100 animate-pulse" />
          <div className="h-6 w-56 mx-auto rounded bg-kale-50 animate-pulse" />
          <div className="h-8 w-72 mx-auto rounded bg-kale-50 animate-pulse" />
        </div>
      </main>
    </div>
  );
}
