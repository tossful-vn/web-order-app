"use client";

import { useRef } from "react";
import { useLang, persistLang, type Lang } from "@/lib/lang";
import { captureSource } from "@/lib/analytics/source";
import { trackCalcLangToggled } from "@/lib/analytics/events";
import BeaconsCta from "./BeaconsCta.client";

// Brand constants — exact hex per the TSK-169 locked decision (these differ
// slightly from the tailwind kale tokens, so we set them inline).
const KALE = "#0F563D";
const CREAM = "#F4F1E6";

/**
 * Minimal marketing shell for /nutrition ONLY (TSK-169, Option C).
 *
 * /nutrition is an anonymous-first, shareable surface linked from
 * beacons.ai/tossful, so it deliberately does NOT use AppShell (no drawer, no
 * nav, no auth affordances). Just a brand logo + EN/VI toggle on a cream
 * background, plus a static Beacons "Order here" footer card. AppShell stays in
 * place for /account, /byw, /loyalty.
 */
export default function MvpShell({ children }: { children: React.ReactNode }) {
  const [lang] = useLang();

  // Capture first-touch marketing source (?src + utm_*) during the OUTERMOST
  // shell's render — before any child CTA mounts and fires a "shown" event —
  // so every event in the session carries the same attribution. Idempotent
  // (first-touch wins), ref-guarded against React StrictMode double-render.
  const capturedRef = useRef(false);
  if (!capturedRef.current && typeof window !== "undefined") {
    capturedRef.current = true;
    captureSource(window.location.search);
  }

  const toggle = (to: Lang) => {
    if (to === lang) return;
    persistLang(to);
    trackCalcLangToggled(to, to);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      {/* Tabler icons CDN — the calculator + CTAs render `ti` glyphs. AppShell
          normally provides this; MvpShell must supply it on /nutrition. */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.21.0/dist/tabler-icons.min.css"
      />

      <header className="sticky top-0 z-30 border-b" style={{ background: CREAM, borderColor: "rgba(15,86,61,0.12)" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <span
            className="font-display italic text-2xl leading-none"
            style={{ color: KALE, letterSpacing: "-0.2px" }}
          >
            Tossful
          </span>

          {/* EN / VI toggle — reuses the shared useLang state. */}
          <div className="flex rounded-full p-0.5" style={{ background: "rgba(15,86,61,0.08)" }}>
            {(["en", "vi"] as const).map((l) => {
              const active = lang === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggle(l)}
                  aria-pressed={active}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={
                    active
                      ? { background: KALE, color: CREAM }
                      : { color: KALE, background: "transparent" }
                  }
                >
                  {l.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Static Beacons acquisition card — always visible (trigger='footer'). */}
      <footer className="max-w-3xl mx-auto w-full px-4 pb-8 pt-4">
        <BeaconsCta lang={lang} trigger="footer" variant="footer" />
      </footer>
    </div>
  );
}
// trailing ASCII buffer
