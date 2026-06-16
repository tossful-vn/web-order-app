"use client";

// Standalone copy table (Vietnamese up top, ASCII body below) per the
// CityPromptModal pattern. TSK-169 anonymous save popup + loyalty on-ramp.
const VI = {
  header_named: "Đây là tô của {name}:",
  header_anon: "Đây là tô của bạn:",
  name_ph: "Tên của bạn (không bắt buộc)",
  nutrition: "Dinh dưỡng",
  tip: "Mẹo: chụp màn hình để lưu hoặc chia sẻ tô của bạn.",
  cal: "cal",
  onramp_title: "Lưu công thức + tích tem Magic Stamp",
  onramp_body:
    "Đăng ký để lưu tô yêu thích và tích tem Magic Stamp từ đơn tại quầy (sau khi xác minh số điện thoại).",
  onramp_cta: "Đăng ký để lưu",
  close: "Đóng",
};
const EN = {
  header_named: "Here is your bowl, {name}:",
  header_anon: "Here is your bowl:",
  name_ph: "Your name (optional)",
  nutrition: "Nutrition",
  tip: "Tip: screenshot to save or share your bowl.",
  cal: "cal",
  onramp_title: "Save recipes + earn Magic Stamps",
  onramp_body:
    "Sign up to save your favourite bowls and earn Magic Stamps on store visits (after you verify your phone).",
  onramp_cta: "Sign up to save",
  close: "Close",
};

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/lang";
import { trackCalcOnrampShown, trackCalcOnrampClicked } from "@/lib/analytics/events";

/** localStorage key the (optional) screenshot name is stashed under. */
const NAME_KEY = "tossful:calc_customer_name";
/** Anonymous users land here to sign up, then bounce back to /nutrition. */
const SIGNUP_HREF = "/signup?next=/nutrition";

export type BowlMacros = {
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
};
export type SummaryRow = { id: string; name: string; cal: number };

type Props = {
  lang: Lang;
  bowlName: string;
  macros: BowlMacros;
  rows: SummaryRow[];
  onClose: () => void;
};

/**
 * Anonymous "Save bowl" result (TSK-169, Option C). NO DB write — instead we
 * give the visitor a screenshot-friendly summary (their name → localStorage)
 * plus a soft loyalty on-ramp: sign up to save recipes + earn Magic Stamps on
 * store visits. No forced wall — they can just close and screenshot.
 */
export default function SaveSummaryModal({ lang, bowlName, macros, rows, onClose }: Props) {
  const s = lang === "vi" ? VI : EN;
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");

  // Prefill the name from a previous session; enter animation next frame.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NAME_KEY);
      if (stored) setName(stored);
    } catch {
      /* localStorage disabled — name simply starts blank */
    }
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // The on-ramp card is part of this popup, so the popup opening === the
  // on-ramp impression. Fire once.
  useEffect(() => {
    trackCalcOnrampShown(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the screenshot name as the customer types (debounce-free — cheap).
  const handleName = (v: string) => {
    setName(v);
    try {
      if (v.trim()) window.localStorage.setItem(NAME_KEY, v.trim());
      else window.localStorage.removeItem(NAME_KEY);
    } catch {
      /* non-fatal */
    }
  };

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const header = (name.trim() ? s.header_named.replace("{name}", name.trim()) : s.header_anon);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={header}
    >
      <div
        className={"absolute inset-0 transition-opacity duration-300 " + (show ? "opacity-100" : "opacity-0")}
        style={{ background: "rgba(15,86,61,0.45)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={
          "relative w-full sm:max-w-md bg-cream rounded-t-2xl sm:rounded-2xl shadow-2xl " +
          "px-5 pt-6 pb-5 sm:p-7 transition-all duration-300 ease-out max-h-[92vh] overflow-y-auto " +
          (show ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0")
        }
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={s.close}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-kale-50 text-kale-700 flex items-center justify-center"
        >
          <i className="ti ti-x text-lg" aria-hidden="true" />
        </button>

        <input
          type="text"
          value={name}
          onChange={(e) => handleName(e.target.value)}
          maxLength={40}
          placeholder={s.name_ph}
          className="w-full mb-3 rounded-xl border border-kale-200 bg-white px-3 py-2 text-sm text-ink focus:border-kale-500 focus:outline-none"
        />

        <h2 className="font-display text-xl text-kale-700 leading-snug mb-1">{header}</h2>
        <div className="font-medium text-ink mb-3">{bowlName}</div>

        {/* Macros — screenshot-friendly summary */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {([
            { k: "cal", v: Math.round(macros.cal), suffix: "" },
            { k: "protein", v: macros.protein.toFixed(1), suffix: "g" },
            { k: "fat", v: macros.fat.toFixed(1), suffix: "g" },
            { k: "carbs", v: macros.carbs.toFixed(1), suffix: "g" },
          ] as const).map(({ k, v, suffix }) => (
            <div key={k} className="rounded-xl bg-white border border-kale-100 px-2 py-2 text-center">
              <div className="text-base font-semibold text-kale-700 leading-none">
                {v}
                {suffix}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-kale-400 mt-1">{k}</div>
            </div>
          ))}
        </div>

        {rows.length > 0 && (
          <ul className="text-sm text-ink/80 mb-3 space-y-0.5">
            {rows.map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span className="truncate">{r.name}</span>
                <span className="text-kale-400 shrink-0">
                  {Math.round(r.cal)} {s.cal}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-kale-500 mb-4">{s.tip}</p>

        {/* Soft loyalty on-ramp — NOT a wall. */}
        <div className="rounded-2xl border border-kale-200 bg-kale-50 px-4 py-4">
          <div className="font-display text-lg text-kale-800 leading-tight mb-1">
            {s.onramp_title}
          </div>
          <p className="text-sm text-kale-600 mb-3">{s.onramp_body}</p>
          <Link
            href={SIGNUP_HREF}
            onClick={() => trackCalcOnrampClicked(lang)}
            className="inline-flex items-center gap-2 rounded-xl bg-kale-700 text-cream px-4 py-2.5 text-sm font-medium no-underline hover:bg-kale-800"
          >
            {s.onramp_cta}
            <i className="ti ti-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
// trailing ASCII buffer
