"use client";

// Vietnamese strings as const up top per phase2-session-lessons gotcha #1.
const VI = {
  label: "Cửa hàng yêu thích",
  hint: "Dùng để hiển thị giá theo cửa hàng. Có thể đổi bất cứ lúc nào.",
  hn: "Hà Nội",
  hcm: "TP.HCM",
  none: "Bỏ chọn",
  saved: "Đã lưu cửa hàng",
  cleared: "Đã bỏ chọn cửa hàng",
  error: "Không lưu được, thử lại nhé.",
};

const EN = {
  label: "Preferred store",
  hint: "Used to show store-specific prices. Change it anytime.",
  hn: "Hanoi",
  hcm: "HCMC",
  none: "Not set",
  saved: "Store saved",
  cleared: "Store cleared",
  error: "Could not save, please try again.",
};

import { useState } from "react";
import { setPreferredStore, clearPreferredStore } from "@/lib/profile/actions";
import type { StoreCity } from "@/lib/types/database";

type Lang = "en" | "vi";
type Choice = StoreCity | null;

/**
 * Preferred-store toggle (TSK-130). Three states — HN / HCM / not set — each
 * persisted immediately via the dedicated server actions with a confirmation
 * toast. Lives separately from the name/phone form so it can change the city
 * without a full-form submit (and vice-versa).
 */
export default function StoreToggle({ initial, lang }: { initial: Choice; lang: Lang }) {
  const s = lang === "vi" ? VI : EN;
  const [choice, setChoice] = useState<Choice>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const apply = async (next: Choice) => {
    if (pending || next === choice) return;
    const previous = choice;
    setChoice(next); // optimistic
    setPending(true);
    try {
      if (next === null) await clearPreferredStore();
      else await setPreferredStore(next);
      setToast(next === null ? s.cleared : s.saved);
    } catch {
      setChoice(previous); // roll back on failure
      setToast(s.error);
    } finally {
      setPending(false);
      window.setTimeout(() => setToast(null), 2200);
    }
  };

  const options: Array<{ value: Choice; text: string }> = [
    { value: "HN", text: s.hn },
    { value: "HCM", text: s.hcm },
    { value: null, text: s.none },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-kale-700 mb-2">{s.label}</label>
      <div className="grid grid-cols-3 gap-3">
        {options.map((opt) => {
          const active = choice === opt.value;
          return (
            <button
              key={opt.value ?? "none"}
              type="button"
              onClick={() => { void apply(opt.value); }}
              disabled={pending}
              aria-pressed={active}
              className={
                "rounded-lg border-2 px-3 py-3 text-sm transition-colors disabled:opacity-60 " +
                (active
                  ? "border-kale-600 bg-kale-50 text-kale-800 font-medium"
                  : "border-kale-200 bg-white text-kale-600 hover:border-kale-400")
              }
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-kale-500 mt-1">{s.hint}</p>

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 z-40 rounded-full bg-kale-800 text-cream text-xs px-4 py-2 shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
// trailing ASCII buffer
