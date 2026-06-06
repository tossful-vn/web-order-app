"use client";

import { PLAN_STR, type Lang } from "../i18n";
import type { ResolvedBowl } from "../types";

type Props = {
  lang: Lang;
  dayLong: string; // "Thứ 2"
  dayEn: string; // "Mon"
  dateLabel: string; // "6/6"
  bowl: ResolvedBowl | null;
  selected: boolean; // this day is the active picker target
  onSelect: () => void; // tap empty slot, or tap filled slot (opens options)
  onRemove: () => void; // quick-remove on a filled slot
};

function bowlName(b: ResolvedBowl, lang: Lang): string {
  return lang === "vi" && b.name_vn ? b.name_vn : b.name_en;
}

function initial(b: ResolvedBowl): string {
  return (b.name_en || "?").trim().charAt(0).toUpperCase();
}

export default function DaySlot({
  lang,
  dayLong,
  dayEn,
  dateLabel,
  bowl,
  selected,
  onSelect,
  onRemove,
}: Props) {
  const str = PLAN_STR[lang];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "w-full text-left rounded-2xl border bg-white px-3 py-3 transition-colors " +
        (selected
          ? "border-kale-500 ring-2 ring-kale-200"
          : bowl
            ? "border-kale-100 active:bg-kale-50"
            : "border-dashed border-kale-300 active:bg-kale-50")
      }
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-kale-700">
          {dayLong}{" "}
          <span className="text-kale-400 font-normal">
            ({dayEn}, {dateLabel})
          </span>
        </div>
      </div>

      {bowl ? (
        <div className="mt-2 flex items-center gap-3">
          {bowl.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bowl.photo}
              alt=""
              className="w-12 h-12 rounded-xl object-cover shrink-0 bg-kale-50"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-kale-700 text-cream flex items-center justify-center text-lg font-display italic shrink-0">
              {initial(bowl)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink truncate">{bowlName(bowl, lang)}</div>
            <div className="text-xs text-kale-500">
              {Math.round(bowl.kcal)} {str.cal} · {Math.round(bowl.protein_g)}g {str.macro_protein}
            </div>
          </div>
          <span
            role="button"
            tabIndex={-1}
            aria-label={str.slot_remove}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-8 h-8 rounded-full bg-kale-50 text-kale-500 flex items-center justify-center shrink-0 active:bg-kale-100"
          >
            <i className="ti ti-x text-base" />
          </span>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2 text-sm text-kale-400">
          <i className="ti ti-plus text-base" />
          <span>{selected ? str.slot_prompt : str.empty_slot}</span>
        </div>
      )}
    </button>
  );
}
