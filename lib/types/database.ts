/**
 * Hand-written TypeScript shapes for the Phase 2 tables.
 * When the team is ready, regenerate these with:
 *   npx supabase gen types typescript --project-id <id> > lib/types/supabase.ts
 * For now, hand-rolled keeps the dev loop simple.
 */

/**
 * City code for store selection + city-based pricing (D8).
 * Drives which items.price_vnd_* column the calculator reads
 * (price_vnd_hn / price_vnd_hcm).
 */
export type StoreCity = "HN" | "HCM";

/** profiles.role — gates /staff/orders-board access (D3). */
export type ProfileRole = "customer" | "staff" | "admin";

export type Profile = {
  id: string;
  display_name: string | null;
  contact_phone: string | null;
  preferred_store: StoreCity;
  role: ProfileRole;
  zalo_oa_subscribed: boolean;
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

/**
 * Phase 1.5 Sprint 1 (TSK-117) — login + Saved bowls + Plan my Week + Path-1
 * order queue. Hand-rolled to match this file's convention (the project does
 * not commit generated Supabase types). These mirror the byw_plans /
 * orders_pending table rows exactly. Types live here (not in lib/byw.ts)
 * because that module is "use server" and may only export async functions.
 */

/** Weekday keys for a plan / delivery prefs. Mon–Fri (D7 planner). */
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";

/**
 * byw_plans.slots — maps each weekday to a saved_bowls.id (or null for an
 * unplanned day). Stored as freeform jsonb and validated app-side so the
 * planner can evolve days/keys without a migration.
 */
export type BywSlots = Partial<Record<DayKey, string | null>>;

/** Row of public.byw_plans. */
export type BywPlan = {
  id: string;
  user_id: string;
  week_start_date: string; // ISO date — Monday of the planned week
  slots: BywSlots;
  created_at: string;
  updated_at: string;
};

/** public.order_status enum. */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "sent_to_ipos"
  | "fulfilled"
  | "cancelled"
  | "rejected";

/**
 * orders_pending.delivery_prefs — freeform jsonb, validated app-side.
 * time_slots/notes_per_day are keyed by weekday.
 */
export type DeliveryPrefs = {
  address_id: string | null;
  time_slots: Partial<Record<DayKey, string>>;
  notes_per_day: Partial<Record<DayKey, string>>;
};

/** Row of public.orders_pending. */
export type OrderPending = {
  id: string;
  plan_id: string;
  user_id: string;
  status: OrderStatus;
  delivery_prefs: DeliveryPrefs;
  reject_reason: string | null;
  staff_confirmed_by: string | null;
  staff_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};
