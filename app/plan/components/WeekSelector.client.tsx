"use client";

import Link from "next/link";
import { PLAN_STR, type Lang } from "../i18n";

type Props = {
  lang: Lang;
  title: string;
  rangeLabel: string;
  isCurrent: boolean;
  prevHref: string;
  nextHref: string;
  thisHref: string;
};

/**
 * Week navigation header. Prev / next are plain links that change `?week=` so
 * the server reloads that week's plan; "Tuần này" jumps back to the current week.
 */
export default function WeekSelector({
  lang,
  title,
  rangeLabel,
  isCurrent,
  prevHref,
  nextHref,
  thisHref,
}: Props) {
  const str = PLAN_STR[lang];
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Link
          href={prevHref}
          prefetch
          aria-label={str.week_prev}
          className="w-9 h-9 rounded-full bg-kale-50 text-kale-700 flex items-center justify-center shrink-0 active:bg-kale-100"
        >
          <i className="ti ti-chevron-left text-xl" />
        </Link>

        <div className="flex-1 text-center min-w-0">
          <div className="text-sm font-medium text-kale-700 truncate">
            {isCurrent ? str.week_this : rangeLabel}
          </div>
          {isCurrent && <div className="text-[11px] text-kale-500 truncate">{rangeLabel}</div>}
        </div>

        <Link
          href={nextHref}
          prefetch
          aria-label={str.week_next}
          className="w-9 h-9 rounded-full bg-kale-50 text-kale-700 flex items-center justify-center shrink-0 active:bg-kale-100"
        >
          <i className="ti ti-chevron-right text-xl" />
        </Link>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <h1 className="font-display italic text-kale-700 text-xl leading-tight truncate">
          {title}
        </h1>
        {!isCurrent && (
          <Link
            href={thisHref}
            prefetch
            className="text-xs text-kale-600 underline underline-offset-2 shrink-0 active:text-kale-800"
          >
            {str.week_this}
          </Link>
        )}
      </div>
      <p className="text-xs text-kale-500 mt-0.5">{str.subtitle}</p>
    </div>
  );
}
