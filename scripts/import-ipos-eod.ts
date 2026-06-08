/**
 * Manual iPOS EOD → Magic Stamp import (TSK-148).
 *
 * Reads one store's C03 "hoá đơn theo thời gian" JSON export, parses the
 * attributable orders, and applies one stamp per order (idempotent on
 * `tran_id`). This is the manual CLI / action entry point — the automated Hub
 * API pull is TSK-151 and out of scope.
 *
 * Usage:
 *   npx tsx scripts/import-ipos-eod.ts --store HN  --file ./iPOS-RAW_C03_HN_2026-05.json
 *   npx tsx scripts/import-ipos-eod.ts --store HCM --file ./iPOS-RAW_C03_HCM_2026-05.json
 *   # parse-only, no DB writes (validate counts before the schema migration):
 *   npx tsx scripts/import-ipos-eod.ts --store HN --file ./HN.json --dry-run
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (unless --dry-run).
 */
import { readFileSync } from "node:fs";
import { createAdminClient } from "@/lib/supabase/admin";
import { IPOS_STORE_UIDS, parseEodOrders } from "@/lib/ipos/parseEodOrders";
import { applyStamps, createSupabaseStampStore } from "@/lib/ipos/applyStamps";

/** CLI store key → iPOS store_uid + the `stores.code` used to resolve stores.id. */
const STORE_CONFIG = {
  HN: { storeUid: IPOS_STORE_UIDS.HN, storeCode: "CH1" },
  HCM: { storeUid: IPOS_STORE_UIDS.HCM, storeCode: "CH2" },
} as const;

type StoreKey = keyof typeof STORE_CONFIG;

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--store") args.store = argv[++i];
    else if (a === "--file") args.file = argv[++i];
  }
  return args;
}

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const storeKey = String(args.store ?? "").toUpperCase() as StoreKey;
  const file = typeof args.file === "string" ? args.file : "";
  const dryRun = args.dryRun === true;

  if (!STORE_CONFIG[storeKey]) {
    fail(`--store must be one of: ${Object.keys(STORE_CONFIG).join(", ")}`);
  }
  if (!file) fail("--file <path-to-eod.json> is required");

  const { storeUid, storeCode } = STORE_CONFIG[storeKey];

  // 1. Load + parse JSON.
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`could not read/parse ${file}: ${(e as Error).message}`);
  }

  // 2. Resolve stores.id (skipped in dry-run — parsing doesn't need the DB).
  let storeId = `DRY-RUN:${storeCode}`;
  let supabase: ReturnType<typeof createAdminClient> | null = null;
  if (!dryRun) {
    supabase = createAdminClient();
    const { data: store, error } = await supabase
      .from("stores")
      .select("id, name, city")
      .eq("code", storeCode)
      .single();
    if (error || !store) fail(`could not resolve store code ${storeCode}: ${error?.message}`);
    storeId = store.id;
    console.log(`Store: ${store.name} (${store.city}) → ${storeId}`);
  }

  const { orders, stats } = parseEodOrders(raw, storeId, storeUid);
  const distinctPhones = new Set(orders.map((o) => o.phone)).size;

  console.log(`\n── iPOS EOD parse (${storeKey}) ──`);
  console.log(`  read .............. ${stats.read}`);
  console.log(`  attributable ...... ${stats.attributable}`);
  console.log(`  distinct phones ... ${distinctPhones}`);
  console.log(`  dropped (no phone)  ${stats.droppedNoPhone}`);
  console.log(`  dropped (store) ... ${stats.droppedWrongStore}`);
  console.log(`  dropped (no id) ... ${stats.droppedNoTranId}`);
  console.log(`  duplicate tran_ids  ${stats.duplicateTranIds}`);

  if (dryRun) {
    console.log(`\n[dry-run] no DB writes. ~${distinctPhones} customers would get cards.`);
    return;
  }

  // 3. Apply stamps (idempotent).
  const store = createSupabaseStampStore(supabase!);
  const summary = await applyStamps(store, orders);

  console.log(`\n── Magic Stamp apply ──`);
  console.log(`  read .............. ${stats.read}`);
  console.log(`  attributable ...... ${summary.attributable}`);
  console.log(`  inserted .......... ${summary.inserted}`);
  console.log(`  skipped (existing)  ${summary.skippedExisting}`);
  console.log(`  new cards ......... ${summary.newCards}`);
  console.log(`  linked to profile   ${summary.linkedToProfile}`);
  console.log(`  phone-only ........ ${summary.phoneOnly}`);
  if (summary.errors) console.log(`  errors ............ ${summary.errors}`);
  console.log(
    `\n✓ done. Re-running this command imports 0 new stamps (idempotent on tran_id).`,
  );
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
