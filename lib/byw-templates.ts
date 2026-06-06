// Client-side plan templates for the /plan empty state (TSK-118). Each template
// names 5 signature bowls (Mon–Fri). The names are matched diacritic- and
// punctuation-insensitively against the live `signatures` list so a template
// resolves to real item ids regardless of whether the brand name sits in
// items.name_en or items.name_vn.
import type { BywSlots, DayKey } from "@/lib/types/database";
import { DAY_KEYS } from "@/lib/byw-week";

export type PlanTemplate = {
  id: string;
  name_vi: string;
  name_en: string;
  description_vi: string;
  description_en: string;
  /** Canonical signature brand names, one per weekday (Mon–Fri). */
  bowls: string[];
  avg_cal: number;
  avg_protein: number;
};

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "cao-dam",
    name_vi: "Cao đạm",
    name_en: "High-protein",
    description_vi: "Tập gym, tăng cơ",
    description_en: "For gym training + muscle gain",
    bowls: ["Festo", "Kale My Ex, Please!", "Fennel Fling", "Festo", "Mi-So-Cool"],
    avg_cal: 600,
    avg_protein: 40,
  },
  {
    id: "can-bang",
    name_vi: "Cân bằng",
    name_en: "Balanced",
    description_vi: "Lối sống, duy trì",
    description_en: "Lifestyle + maintenance",
    bowls: ["Biết Điều", "Dijon Vu", "Festo", "Thai Me Up", "Biết Điều"],
    avg_cal: 450,
    avg_protein: 30,
  },
  {
    id: "nhe-nhang",
    name_vi: "Nhẹ nhàng",
    name_en: "Light",
    description_vi: "Giảm cân, nhẹ bụng",
    description_en: "Weight loss + light",
    bowls: ["Biết Điều", "Fennel Fling", "Thai Me Up", "Biết Điều", "Fennel Fling"],
    avg_cal: 400,
    avg_protein: 25,
  },
];

/** Collapse a brand name to a comparison key: strip diacritics, đ→d, drop punctuation. */
function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

type SigLite = { id: string; name_en: string; name_vn: string | null };

/**
 * Resolve a template's 5 bowl names against the live signatures list, producing
 * a BywSlots map keyed Mon–Fri. Names that don't match any signature are
 * skipped (that weekday is left empty) rather than erroring.
 */
export function resolveTemplateSlots(
  template: PlanTemplate,
  signatures: SigLite[]
): BywSlots {
  const byNorm = new Map<string, string>();
  for (const s of signatures) {
    byNorm.set(normName(s.name_en), s.id);
    if (s.name_vn) byNorm.set(normName(s.name_vn), s.id);
  }
  const slots: BywSlots = {};
  template.bowls.slice(0, DAY_KEYS.length).forEach((name, i) => {
    const id = byNorm.get(normName(name));
    if (id) slots[DAY_KEYS[i] as DayKey] = id;
  });
  return slots;
}
