"use client";

/**
 * Branded page-transition loader (TSK-153, Part C).
 *
 * Four Tossful ingredients (avocado · tomato · kale · carrot) bounce in an
 * iMessage-dots wave — each icon offset 0.15s — and loop. Inline SVG only (no
 * network image loads), GPU `transform: translateY` so there is no layout shift.
 * Announces itself to assistive tech (`role="status"` + visually-hidden text);
 * `prefers-reduced-motion` swaps the bounce for a gentle opacity pulse.
 *
 * Pass `overlay` for the full-screen kale-50 wash used on route change and while
 * a /byw plan mutation is in flight.
 */
import "./ingredient-loader.css";

const LABELS = { en: "Loading…", vi: "Đang tải…" } as const;

type IconProps = { size?: number };

function Avocado({ size = 34 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <ellipse cx="16" cy="17" rx="8" ry="10" fill="#4a7a3a" />
      <ellipse cx="16" cy="17" rx="5.5" ry="7.5" fill="#cfe0a8" />
      <circle cx="16" cy="19" r="3.6" fill="#7D291A" />
    </svg>
  );
}

function Tomato({ size = 34 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <circle cx="16" cy="19" r="9" fill="#E0533A" />
      <path d="M16 11 l-3-3 m3 3 l0-4 m0 4 l3-3" stroke="#0F563D" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M12 11 q4 2 8 0" stroke="#0F563D" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Kale({ size = 34 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <path d="M16 28 L16 13" stroke="#0F563D" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="11" cy="12" rx="5.5" ry="8" fill="#5c8650" transform="rotate(22 11 12)" />
      <ellipse cx="21" cy="11" rx="5.5" ry="8" fill="#3a5634" transform="rotate(-18 21 11)" />
      <ellipse cx="16" cy="8" rx="5" ry="7.5" fill="#4a7a3a" />
    </svg>
  );
}

function Carrot({ size = 34 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <ellipse cx="16" cy="19" rx="5" ry="10" fill="#F68C02" transform="rotate(-18 16 19)" />
      <path d="M14 9 Q16 3 18 9" stroke="#0F563D" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M11 10 Q13 5 16 8" stroke="#0F563D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const ICONS = [Avocado, Tomato, Kale, Carrot];

type Props = {
  lang?: "en" | "vi";
  /** Wrap in the full-screen kale-50 wash (route change / mutation in flight). */
  overlay?: boolean;
  size?: number;
  /** Override the announced label; defaults to the localized "Loading…". */
  label?: string;
};

export default function IngredientLoader({ lang = "vi", overlay = false, size = 34, label }: Props) {
  const text = label ?? LABELS[lang];

  const loader = (
    <div className="ing-loader" role="status" aria-live="polite">
      {ICONS.map((Icon, i) => (
        <span key={i} className="ing-loader-dot" style={{ ["--i" as string]: i }}>
          <Icon size={size} />
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </div>
  );

  return overlay ? <div className="ing-loader-overlay">{loader}</div> : loader;
}
