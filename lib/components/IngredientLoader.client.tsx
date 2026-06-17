"use client";

/**
 * Branded page-transition loader (TSK-153 Part C → TSK-170 half-moon refresh).
 *
 * A single "bán nguyệt" (half-moon) kale arc spins over a faint track, with a
 * beetroot-pink leading dot — the Tossful take on a spinner. Inline SVG only (no
 * network image loads), GPU `transform: rotate` so there is no layout shift.
 * Announces itself to assistive tech (`role="status"` + visually-hidden text);
 * `prefers-reduced-motion` swaps the spin for a gentle opacity pulse.
 *
 * Pass `overlay` for the full-screen kale-50 wash used on route change and while
 * a /byw plan mutation is in flight.
 */
import "./ingredient-loader.css";

const LABELS = { en: "Loading…", vi: "Đang tải…" } as const;

type Props = {
  lang?: "en" | "vi";
  /** Wrap in the full-screen kale-50 wash (route change / mutation in flight). */
  overlay?: boolean;
  size?: number;
  /** Override the announced label; defaults to the localized "Loading…". */
  label?: string;
};

export default function IngredientLoader({ lang = "vi", overlay = false, size = 40, label }: Props) {
  const text = label ?? LABELS[lang];

  const loader = (
    <div className="ing-loader" role="status" aria-live="polite">
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        {/* Faint full-circle track the arc sweeps over. */}
        <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(15,86,61,0.14)" strokeWidth="6" />
        {/* Spinning half-moon kale arc + beetroot-pink leading dot. */}
        <g className="ing-loader-arc">
          <path
            d="M24 6 A18 18 0 0 1 24 42"
            fill="none"
            stroke="#0F563D"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="24" cy="42" r="3.4" fill="#F8E3F3" />
        </g>
      </svg>
      <span className="sr-only">{text}</span>
    </div>
  );

  return overlay ? <div className="ing-loader-overlay">{loader}</div> : loader;
}
