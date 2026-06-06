"use client";

import { PLAN_STR, type Lang } from "../i18n";

type Props = {
  lang: Lang;
  /** Per-day averages across filled slots. */
  avg: { cal: number; protein: number; fat: number; carbs: number };
};

/** Sticky weekly-average macro strip. Parent only renders this when >=1 slot is filled. */
export default function MacrosSummary({ lang, avg }: Props) {
  const str = PLAN_STR[lang];
  return (
    <div className="rounded-2xl bg-kale-700 text-cream px-4 py-3 shadow-sm">
      <div className="text-[10px] uppercase tracking-widest text-kale-200 font-medium">
        {str.macros_header}
      </div>
      <div className="mt-1 text-sm font-medium flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-kale-200">{str.avg_label}:</span>
        <span>
          {Math.round(avg.cal)} {str.cal}
        </span>
        <span className="text-kale-300">·</span>
        <span>
          {Math.round(avg.protein)}g {str.macro_protein}
        </span>
        <span className="text-kale-300">·</span>
        <span>
          {Math.round(avg.fat)}g {str.macro_fat}
        </span>
        <span className="text-kale-300">·</span>
        <span>
          {Math.round(avg.carbs)}g {str.macro_carb}
        </span>
      </div>
    </div>
  );
}
