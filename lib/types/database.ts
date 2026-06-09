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
  /**
   * Canonical login identity + iPOS member lookup key (TSK-127). VN format
   * 0xxxxxxxxx, UNIQUE. Distinct from contact_phone (delivery/order phone).
   * Nullable so pre-TSK-127 accounts don't break; new signups always set it.
   */
  phone: string | null;
  /**
   * Whether `phone` was proven via Zalo OTP (TSK-149 retro-verify). Defaults
   * false on every existing row at migration time. Since TSK-155 this is the
   * SOLE gate for iPOS stamp + BYO attribution (Hieu's rule): a phone merely
   * present on a profile no longer earns — only `phone_verified = true` does.
   * Pre-TSK-155 accounts that signed up via phone-OTP must retro-verify to start
   * earning; their past orders are persisted in `ipos_orders` and back-fill on
   * verify. `phone_verified_at` is the moment it flipped true.
   */
  phone_verified: boolean;
  phone_verified_at: string | null;
  contact_phone: string | null;
  /**
   * NULL until the customer picks a store (TSK-130). New signups start unset so
   * the calculator shows the lazy "which store?" prompt before revealing
   * city-specific prices; guests and unset customers see no prices at all.
   */
  preferred_store: StoreCity | null;
  role: ProfileRole;
  zalo_oa_subscribed: boolean;
  /**
   * Consent capture for VN PDPL 2025 readiness (TSK-143).
   * - transactional: order confirmations / receipts / account mail. Always TRUE
   *   server-side — service operation needs it; surfaced read-only in /account.
   * - marketing: promos / vouchers / events. Opt-IN (defaults FALSE).
   * - updated_at: last time either consent changed.
   */
  consent_marketing: boolean;
  consent_transactional: boolean;
  consent_updated_at: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
};

/**
 * phone_otp_pending.purpose — OTP verifies phone ownership. signup/reset
 * (TSK-127) + verify (TSK-149 retroactive phone verification in /account).
 */
export type OtpPurpose = "signup" | "reset" | "verify";

/** Row of public.phone_otp_pending. Service-role only (RLS on, no policies). */
export type PhoneOtpPending = {
  id: string;
  phone: string;
  otp_hash: string;
  purpose: OtpPurpose;
  expires_at: string;
  attempts: number;
  created_at: string;
};

/**
 * Row of public.ipos_orders (TSK-155, Option B). Every attributable iPOS EOD
 * order is persisted here (one row per `ipos_tran_id`), whether or not a verified
 * web account exists yet. Unverified/unmatched orders carry `profile_id` NULL and
 * are linked + replayed into stamps when the customer later verifies their phone.
 * Customer-facing reads are owner-scoped via RLS (profile_id = auth.uid()).
 */
export type IposOrder = {
  id: string;
  ipos_tran_id: string;
  store_id: string | null;
  phone: string | null;
  profile_id: string | null;
  ordered_at: string;
  source: string;
  created_at: string;
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
