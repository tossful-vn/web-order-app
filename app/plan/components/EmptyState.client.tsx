"use client";

import Link from "next/link";
import { PLAN_STR, type Lang } from "../i18n";
import { type PlanTemplate } from "@/lib/byw-templates";
import TemplateCards from "./TemplateCards.client";

type Props = {
  lang: Lang;
  hasSavedBowls: boolean;
  onApply: (template: PlanTemplate) => void;
};

/**
 * Shown whenever the current week's plan is empty. Surfaces the three starter
 * templates prominently; if the customer also has no saved bowls, it nudges
 * them to the calculator. With saved bowls, it points to the drawer instead.
 */
export default function EmptyState({ lang, hasSavedBowls, onApply }: Props) {
  const str = PLAN_STR[lang];
  return (
    <section className="rounded-2xl border border-kale-100 bg-cream p-4">
      <h2 className="text-base font-medium text-kale-700">{str.empty_title}</h2>
      <p className="text-xs text-kale-500 mt-1">{str.empty_ways}</p>

      <div className="mt-3">
        <TemplateCards lang={lang} onApply={onApply} />
      </div>

      <p className="text-xs text-kale-500 mt-3">{str.empty_diy}</p>
      {!hasSavedBowls && (
        <Link
          href="/nutrition"
          prefetch
          className="inline-flex items-center gap-1 mt-2 text-sm text-kale-700 font-medium underline underline-offset-2"
        >
          <i className="ti ti-calculator text-base" />
          {str.open_calc}
        </Link>
      )}
    </section>
  );
}
