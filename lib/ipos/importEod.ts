/**
 * iPOS EOD import orchestration (TSK-151, Part 1).
 *
 * Wraps the already-built + tested parse/apply pipeline (TSK-148/153/155) so it
 * can be driven from one place — the protected HTTP endpoint
 * (app/api/ipos/import) and, transitively, the nightly EOD job + the one-time
 * May backfill. This adds NO new parsing: it composes
 *   parseEodOrders → applyIposOrders + applyStamps   (orders + Magic Stamps)
 *   parseByoBowls  → applyByoBowls                    (BYO preference archive)
 * exactly as scripts/import-ipos-eod.ts does, and is fully idempotent on the
 * existing keys (ipos_tran_id / tran_id / ipos_line_id) — re-importing the same
 * day inserts nothing new.
 *
 * The orchestrator talks to a small `ImportStores` port (resolveStoreId + the
 * three existing apply-stores) so it can be unit tested against in-memory fakes;
 * `createSupabaseImportStores` is the live service-role adapter used by the route.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { IPOS_STORE_UIDS, parseEodOrders } from "@/lib/ipos/parseEodOrders";
import {
  applyStamps,
  createSupabaseStampStore,
  type StampStore,
} from "@/lib/ipos/applyStamps";
import {
  applyIposOrders,
  createSupabaseIposOrderStore,
  type IposOrderStore,
} from "@/lib/ipos/applyIposOrders";
import { parseByoBowls } from "@/lib/ipos/parseByoBowls";
import {
  applyByoBowls,
  createSupabaseByoStore,
  type ByoStore,
} from "@/lib/ipos/applyByoBowls";

/**
 * Request store key → iPOS `store_uid` + the `stores.code` used to resolve
 * `stores.id` (the TSK-148 mapping, identical to the CLI's STORE_CONFIG).
 */
export const IPOS_IMPORT_STORES = {
  HN: { storeUid: IPOS_STORE_UIDS.HN, storeCode: "CH1" },
  HCM: { storeUid: IPOS_STORE_UIDS.HCM, storeCode: "CH2" },
} as const;

export type IposStoreKey = keyof typeof IPOS_IMPORT_STORES;

/** Narrowing guard for the request `store` field. */
export function isIposStoreKey(value: unknown): value is IposStoreKey {
  return typeof value === "string" && value in IPOS_IMPORT_STORES;
}

/** The DB operations the orchestrator needs, behind a port for testability. */
export type ImportStores = {
  /** Resolve a `stores.id` from a `stores.code` ("CH1"/"CH2"), or null. */
  resolveStoreId(storeCode: string): Promise<string | null>;
  orderStore: IposOrderStore;
  stampStore: StampStore;
  byoStore: ByoStore;
};

/** Thrown when the store code can't be resolved — surfaced as a 404 by the route. */
export class StoreNotFoundError extends Error {
  constructor(storeCode: string) {
    super(`could not resolve store code ${storeCode}`);
    this.name = "StoreNotFoundError";
  }
}

/** The JSON summary returned to the caller (and logged by the nightly job). */
export type IposImportSummary = {
  store: IposStoreKey;
  orders_read: number;
  attributable: number;
  /** New `ipos_orders` rows persisted this run (idempotent on ipos_tran_id). */
  orders_persisted: number;
  stamps_inserted: number;
  new_cards: number;
  byo_bowls: number;
  byo_ingredients: number;
  modifiers_flagged: number;
  /** Per-stage skip breakdown (the bulk of these are idempotency hits on re-POST). */
  skipped: {
    orders_existing: number;
    orders_undated: number;
    stamps_existing: number;
    stamps_no_account: number;
    stamps_pre_verification: number;
    stamps_undated: number;
    byo_existing: number;
    byo_undated: number;
  };
};

/**
 * Run the full iPOS EOD import for one store's C03 data array.
 *
 * @param stores   The DB port (live service-role adapter, or an in-memory fake).
 * @param storeKey "HN" | "HCM".
 * @param raw      The C03 data array (or a common `{ data: [...] }` envelope).
 */
export async function runIposImport(
  stores: ImportStores,
  storeKey: IposStoreKey,
  raw: unknown,
): Promise<IposImportSummary> {
  const { storeUid, storeCode } = IPOS_IMPORT_STORES[storeKey];

  // Resolve stores.id up front — wrong store code is a hard error, not an empty import.
  const storeId = await stores.resolveStoreId(storeCode);
  if (!storeId) throw new StoreNotFoundError(storeCode);

  // 1. Parse (pure, no DB). Wrong-store rows are dropped against expectedStoreUid.
  const { orders, stats } = parseEodOrders(raw, storeId, storeUid);
  const byo = parseByoBowls(raw, storeId, storeUid);

  // 2. Persist every attributable order, mint stamps for verified accounts, and
  //    archive BYO bowls — all idempotent on their respective iPOS keys.
  const orderSummary = await applyIposOrders(stores.orderStore, orders);
  const stampSummary = await applyStamps(stores.stampStore, orders);
  const byoSummary = await applyByoBowls(stores.byoStore, byo.bowls);

  return {
    store: storeKey,
    orders_read: stats.read,
    attributable: stats.attributable,
    orders_persisted: orderSummary.inserted,
    stamps_inserted: stampSummary.inserted,
    new_cards: stampSummary.newCards,
    byo_bowls: byoSummary.inserted,
    byo_ingredients: byoSummary.ingredients,
    modifiers_flagged: byo.stats.modifierIngredients,
    skipped: {
      orders_existing: orderSummary.skippedExisting,
      orders_undated: orderSummary.skippedUndated,
      stamps_existing: stampSummary.skippedExisting,
      stamps_no_account: stampSummary.skippedNoAccount,
      stamps_pre_verification: stampSummary.skippedPreVerification,
      stamps_undated: stampSummary.skippedUndated,
      byo_existing: byoSummary.skippedExisting,
      byo_undated: byoSummary.skippedUndated,
    },
  };
}

/**
 * Live `ImportStores` backed by a service-role Supabase client (bypasses RLS).
 * SERVER-ONLY — see lib/supabase/admin.ts; never construct from the browser.
 */
export function createSupabaseImportStores(supabase: SupabaseClient): ImportStores {
  return {
    async resolveStoreId(storeCode) {
      const { data } = await supabase
        .from("stores")
        .select("id")
        .eq("code", storeCode)
        .maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },
    orderStore: createSupabaseIposOrderStore(supabase),
    stampStore: createSupabaseStampStore(supabase),
    byoStore: createSupabaseByoStore(supabase),
  };
}
