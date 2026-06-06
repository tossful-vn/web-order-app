"use client";

import Link from "next/link";
import { PLAN_STR, type Lang } from "../i18n";
import type { ResolvedBowl } from "../types";

type Props = {
  lang: Lang;
  bowls: ResolvedBowl[];
  /** Localized label of the day currently being filled, or null. */
  selectedDayLabel: string | null;
  onPick: (bowlId: string) => void;
};

function bowlName(b: ResolvedBowl, lang: Lang): string {
  return lang === "vi" && b.name_vn ? b.name_vn : b.name_en;
}

function initial(b: ResolvedBowl): string {
  return (b.name_en || "?").trim().charAt(0).toUpperCase();
}

/**
 * Saved-bowls panel. Mobile: a sticky bottom strip with a horizontal scroll row.
 * Desktop: the parent grid places it as a left column (vertical wrap). When a
 * slot is selected the header turns into a picker prompt.
 */
export default function SavedBowlsDrawer({ lang, bowls, selectedDayLabel, onPick }: Props) {
  const str = PLAN_STR[lang];

  return (
    <section className="rounded-2xl border border-kale-100 bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-kale-700">{str.drawer_title}</h2>
        <span className="text-[11px] text-kale-500 truncate">
          {selectedDayLabel ? str.pick_for(selectedDayLabel) : str.drawer_idle}
        </span>
      </div>

      {bowls.length === 0 ? (
        <div className="mt-2 text-xs text-kale-500">
          <p>{str.no_saved}</p>
          <Link
            href="/nutrition"
            prefetch
            className="inline-flex items-center gap-1 mt-2 text-kale-700 font-medium underline underline-offset-2"
          >
            <i className="ti ti-calculator text-sm" />
            {str.open_calc}
          </Link>
        </div>
      ) : (
        <div className="mt-2 flex gap-2 overflow-x-auto plan-noscroll lg:flex-wrap lg:overflow-visible">
          {bowls.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onPick(b.id)}
              className="shrink-0 w-24 lg:w-full lg:flex lg:items-center lg:gap-2 rounded-xl border border-kale-100 bg-cream p-2 text-left active:bg-kale-50"
            >
              {b.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.photo}
                  alt=""
                  className="w-full lg:w-10 h-16 lg:h-10 rounded-lg object-cover bg-kale-50 shrink-0"
                />
              ) : (
                <div className="w-full lg:w-10 h-16 lg:h-10 rounded-lg bg-kale-700 text-cream flex items-center justify-center text-lg font-display italic shrink-0">
                  {initial(b)}
                </div>
              )}
              <div className="mt-1 lg:mt-0 min-w-0 lg:flex-1">
                <div className="text-[11px] font-medium text-ink truncate">
                  {bowlName(b, lang)}
                </div>
                <div className="text-[10px] text-kale-500 truncate">
                  {Math.round(b.kcal)} · {Math.round(b.protein_g)}g {str.macro_protein}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
