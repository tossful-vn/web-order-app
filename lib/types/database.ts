/**
 * Hand-written TypeScript shapes for the Phase 2 tables.
 * When the team is ready, regenerate these with:
 *   npx supabase gen types typescript --project-id <id> > lib/types/supabase.ts
 * For now, hand-rolled keeps the dev loop simple.
 */

export type Profile = {
  id: string;
  display_name: string | null;
  contact_phone: string | null;
  preferred_store: "HN" | "SG";
  locale: string;
  created_at: string;
  updated_at: string;
};

export type SavedBowl = {
  id: string;
  user_id: string;
  name: string;
  composition: BowlComposition;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fibre_g: number | null;
  sodium_mg: number | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Snapshot of the calculator state when the customer hit "save".
 * Kept as freeform JSON so the calculator can evolve without breaking
 * older saved bowls. Code that READS old bowls must tolerate missing fields.
 */
export type BowlComposition = {
  schema_version: 1;
  base?: { id: string; name: string; grams: number };
  proteins?: Array<{ id: string; name: string; grams: number }>;
  toppings?: Array<{ id: string; name: string; grams: number }>;
  dressing?: { id: string; name: string; grams: number };
  cot?: { id: string; name: string; grams: number };
  xot?: { id: string; name: string; grams: number };
  /**
   * Components included by a signature recipe that the customer cannot
   * remove or edit (e.g. the tortilla in a wrap variant). Rendered
   * alongside the editable selection but marked "included" on the
   * bowl detail page.
   */
  fixed?: Array<{ id: string; name: string; grams: number; category: string }>;
  notes?: string;
};

export type Week = {
  id: string;
  user_id: string;
  label: string;
  starts_on: string | null;
  status: "draft" | "reserved" | "archived";
  created_at: string;
  updated_at: string;
};

export type WeekSlot = {
  id: string;
  week_id: string;
  user_id: string;
  day_index: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Mon
  bowl_id: string | null;
  created_at: string;
};

export type WeekIntent = {
  id: string;
  user_id: string;
  week_id: string;
  fulfilment_kind: "pickup" | "delivery";
  store_id: "HN" | "SG";
  window_start_date: string;
  window_end_date: string;
  preferred_handoff_time: string | null;
  contact_phone: string;
  contact_email: string | null;
  status: "submitted" | "confirmed" | "declined" | "converted_to_order";
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Macro totals used by the BYW RDI panel.
 * RDI defaults — single adult baseline for v1. Profile-based RDI is parked.
 */
export const DAILY_RDI = {
  kcal: 2000,
  protein_g: 50,
  fat_g: 70,
  carbs_g: 260,
  fibre_g: 28,
  sodium_mg: 2300,
} as const;

export type MacroKey = keyof typeof DAILY_RDI;

/**
 * Phase 2 BYW additions (2026-05-23) — multi-item planning + addon catalog.
 */

export type AddonKind = "drink" | "food" | "wrap" | "side";

export type Addon = {
  id: string;
  kind: AddonKind;
  name_en: string;
  name_vn: string | null;
  description: string | null;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fibre_g: number | null;
  sodium_mg: number | null;
  photo_url: string | null;
  active: boolean;
  in_menu: boolean;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WeekItemKind = "bowl" | "drink" | "food" | "wrap" | "side" | "custom";

export type WeekItem = {
  id: string;
  week_id: string;
  user_id: string;
  day_index: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  item_kind: WeekItemKind;
  bowl_id: string | null;
  addon_id: string | null;
  custom_name: string | null;
  custom_kcal: number | null;
  custom_protein_g: number | null;
  custom_fat_g: number | null;
  custom_carbs_g: number | null;
  custom_fibre_g: number | null;
  sort_order: number;
  created_at: string;
};
