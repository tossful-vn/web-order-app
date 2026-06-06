"use client";

import { PLAN_STR, type Lang } from "../i18n";
import { PLAN_TEMPLATES, type PlanTemplate } from "@/lib/byw-templates";

type Props = {
  lang: Lang;
  onApply: (template: PlanTemplate) => void;
};

function tplName(t: PlanTemplate, lang: Lang): string {
  return lang === "vi" ? t.name_vi : t.name_en;
}

function tplDesc(t: PlanTemplate, lang: Lang): string {
  return lang === "vi" ? t.description_vi : t.description_en;
}

/** The three starter plans. Clicking one populates all five slots + autosaves. */
export default function TemplateCards({ lang, onApply }: Props) {
  const str = PLAN_STR[lang];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PLAN_TEMPLATES.map((t) => (
        <div
          key={t.id}
          className="rounded-2xl border border-kale-100 bg-white p-3 flex flex-col"
        >
          <div className="text-sm font-medium text-kale-700">{tplName(t, lang)}</div>
          <div className="text-xs text-kale-500 mt-0.5">{tplDesc(t, lang)}</div>
          <div className="text-xs text-kale-600 mt-2 flex-1">
            ~{t.avg_cal} {str.cal} · {t.avg_protein}g {str.macro_protein}
            {str.per_bowl}
          </div>
          <button
            type="button"
            onClick={() => onApply(t)}
            className="mt-3 w-full rounded-full bg-kale-700 text-cream text-sm font-medium py-2 active:bg-kale-800"
          >
            {str.template_start}
          </button>
        </div>
      ))}
    </div>
  );
}
