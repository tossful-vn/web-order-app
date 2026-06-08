"use client";

// Vietnamese strings as const up top per phase2-session-lessons gotcha #1.
// Keep body below ASCII-only.
const VI = {
  hn_code: "HN",
  hcm_code: "HCM",
  none_label: "Chưa chọn",
  pick_hn: "Hà Nội",
  pick_hcm: "TP.HCM",
  pick_none: "Bỏ chọn",
  toast_hn: "Đã đổi sang Hà Nội",
  toast_hcm: "Đã đổi sang TP.HCM",
  toast_none: "Đã bỏ chọn cửa hàng",
  error: "Không đổi được, thử lại nhé.",
  aria_open: "Đổi cửa hàng",
};

const EN = {
  hn_code: "HN",
  hcm_code: "HCM",
  none_label: "Not set",
  pick_hn: "Hanoi",
  pick_hcm: "HCMC",
  pick_none: "Clear",
  toast_hn: "Switched to Hanoi",
  toast_hcm: "Switched to HCMC",
  toast_none: "Store cleared",
  error: "Could not switch, please try again.",
  aria_open: "Change store",
};

import { useState } from "react";
import { setPreferredStore, clearPreferredStore } from "@/lib/profile/actions";
import type { StoreCity } from "@/lib/types/database";

type Lang = "en" | "vi";
type Choice = StoreCity | null;

/**
 * Always-accessible header city switch (TSK-145). Elevates the HN/HCM choice
 * out of /account/profile (3-4 taps) to 1 tap from any page. Reuses the TSK-130
 * setPreferredStore/clearPreferredStore server actions — no new actions, no
 * schema change. Local optimistic state mirrors StoreToggle so the chip flips
 * instantly; the server action's revalidatePath refreshes price surfaces.
 */
export default function CityChip({ initial, lang }: { initial: Choice; lang: Lang }) {
  const s = lang === "vi" ? VI : EN;
  const [choice, setChoice] = useState<Choice>(initial);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const codeFor = (c: Choice) =>
    c === "HN" ? s.hn_code : c === "HCM" ? s.hcm_code : s.none_label;

  const toastFor = (c: Choice) =>
    c === "HN" ? s.toast_hn : c === "HCM" ? s.toast_hcm : s.toast_none;

  const apply = async (next: Choice) => {
    setOpen(false);
    if (pending || next === choice) return;
    const previous = choice;
    setChoice(next); // optimistic
    setPending(true);
    try {
      if (next === null) await clearPreferredStore();
      else await setPreferredStore(next);
      setToast(toastFor(next));
    } catch {
      setChoice(previous); // roll back on failure
      setToast(s.error);
    } finally {
      setPending(false);
      window.setTimeout(() => setToast(null), 2200);
    }
  };

  const options: Array<{ value: Choice; text: string }> = [
    { value: "HN", text: s.pick_hn },
    { value: "HCM", text: s.pick_hcm },
    { value: null, text: s.pick_none },
  ];

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={s.aria_open}
        className={
          "flex items-center gap-1 rounded-full bg-kale-50 text-kale-700 " +
          "h-9 pl-2.5 pr-2 text-xs font-medium transition-colors hover:bg-kale-100 " +
          "disabled:opacity-60"
        }
      >
        <span aria-hidden="true">🏬</span>
        <span className="whitespace-nowrap">{codeFor(choice)}</span>
        {pending ? (
          <i className="ti ti-loader-2 text-sm animate-spin" />
        ) : (
          <i className="ti ti-chevron-down text-sm hidden sm:inline" />
        )}
      </button>

      {open && (
        <>
          {/* Click-away backdrop — closes the menu on any outside tap. */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className={
              "absolute right-0 top-full mt-1 z-50 w-40 rounded-xl bg-white " +
              "border border-kale-100 shadow-lg py-1"
            }
          >
            {options.map((opt) => {
              const active = choice === opt.value;
              return (
                <button
                  key={opt.value ?? "none"}
                  type="button"
                  role="menuitem"
                  onClick={() => { void apply(opt.value); }}
                  className={
                    "w-full text-left px-4 py-2.5 text-sm transition-colors " +
                    (active
                      ? "text-kale-800 bg-kale-50 font-medium"
                      : "text-ink hover:bg-kale-50")
                  }
                >
                  {opt.text}
                </button>
              );
            })}
          </div>
        </>
      )}

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 z-50 rounded-full bg-kale-800 text-cream text-xs px-4 py-2 shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
// trailing ASCII buffer
