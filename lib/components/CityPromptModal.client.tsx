"use client";

// Vietnamese strings as const up top per phase2-session-lessons gotcha #1;
// keep the body below ASCII-only.
const VI = {
  title: "Bạn đặt cho cửa hàng nào?",
  hn_name: "Hà Nội",
  hn_sub: "Capital Place",
  hcm_name: "TP.HCM",
  hcm_sub: "Metropole Thủ Thiêm",
  note: "Giá có thể khác nhau giữa 2 cửa hàng.",
  suggest: "Gần bạn",
  skip: "Bỏ qua",
  close: "Đóng",
};

const EN = {
  title: "Which store are you ordering from?",
  hn_name: "Hanoi",
  hn_sub: "Capital Place",
  hcm_name: "HCMC",
  hcm_sub: "Metropole Thu Thiem",
  note: "Prices can differ between the two stores.",
  suggest: "Near you",
  skip: "Skip",
  close: "Close",
};

import { useEffect, useState } from "react";
import type { StoreCity } from "@/lib/types/database";

type Lang = "en" | "vi";

type Props = {
  lang: Lang;
  /** IP-detected likely store — visually highlighted, never auto-selected. */
  suggestedCity?: StoreCity | null;
  /** Customer picked a store. Persist + reveal prices. */
  onSelect: (city: StoreCity) => void;
  /** "Bỏ qua" — dismiss without choosing. Prices stay hidden this session. */
  onClose: () => void;
};

/**
 * Lazy city prompt (TSK-130). Shown the first time a logged-in customer with
 * no preferred_store hits a price-dependent surface (currently /nutrition).
 * Two store cards + a skip affordance. Mobile-first: cards stack the store
 * name over its location; the sheet slides up on small screens.
 */
export default function CityPromptModal({ lang, suggestedCity, onSelect, onClose }: Props) {
  const s = lang === "vi" ? VI : EN;
  // Drive the enter animation: mount hidden, flip `show` true on next frame so
  // the backdrop fades and the sheet slides up.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Close on Escape — treated as "skip".
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cards: Array<{ city: StoreCity; name: string; sub: string }> = [
    { city: "HN", name: s.hn_name, sub: s.hn_sub },
    { city: "HCM", name: s.hcm_name, sub: s.hcm_sub },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={s.title}
    >
      {/* Backdrop — fades in; click = skip */}
      <div
        className={
          "absolute inset-0 transition-opacity duration-300 " +
          (show ? "opacity-100" : "opacity-0")
        }
        style={{ background: "rgba(15,86,61,0.45)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — slides up on mobile, fades/scales on desktop */}
      <div
        className={
          "relative w-full sm:max-w-md bg-cream rounded-t-2xl sm:rounded-2xl shadow-2xl " +
          "px-5 pt-6 pb-5 sm:p-7 transition-all duration-300 ease-out " +
          (show ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0")
        }
      >
        <h2 className="font-display text-2xl text-kale-700 text-center mb-5 leading-snug">
          {s.title}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {cards.map(({ city, name, sub }) => {
            const suggested = suggestedCity === city;
            return (
              <button
                key={city}
                type="button"
                onClick={() => onSelect(city)}
                className={
                  "relative flex flex-col items-center text-center gap-1 rounded-xl border-2 " +
                  "px-3 py-4 transition-colors active:scale-[0.98] " +
                  (suggested
                    ? "border-kale-600 bg-kale-50"
                    : "border-kale-200 bg-white hover:border-kale-400")
                }
              >
                {suggested && (
                  <span className="absolute -top-2 right-2 text-[10px] font-medium uppercase tracking-wide bg-kale-600 text-cream rounded-full px-2 py-0.5">
                    {s.suggest}
                  </span>
                )}
                <i className="ti ti-building-store text-2xl text-kale-700" aria-hidden="true" />
                <span className="font-medium text-kale-800">{name}</span>
                <span className="text-xs text-kale-500 leading-tight">{sub}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-kale-500 text-center mt-4">{s.note}</p>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-kale-500 underline underline-offset-2 hover:text-kale-700 px-4 py-2"
          >
            {s.skip}
          </button>
        </div>
      </div>
    </div>
  );
}
// trailing ASCII buffer
