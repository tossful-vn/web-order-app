# iPOS EOD → Magic Stamp sync (TSK-148)

Turns an iPOS end-of-day order export (C03 "hoá đơn theo thời gian") into Magic
Stamps, keyed by customer phone. One attributable order = one stamp. The stamp
UI (TSK-147) renders what this populates.

## Modules

| File | Role |
|---|---|
| `normalizePhone.ts` | iPOS `84…` phone → canonical `0XXXXXXXXX` key. Reuses `lib/auth/phone`'s `isValidVnPhone` so iPOS phones and web-account phones collide on one key. |
| `parseEodOrders.ts` | Pure EOD JSON → attributable orders (`{tran_id, store_id, phone, tran_date, tran_no}`) + drop/stat breakdown. Maps `store_uid` → `stores.id`. |
| `applyStamps.ts` | Per order: find/create the customer's stamp card, insert one stamp. Idempotent on `tran_id`. Core logic is DB-agnostic (`StampStore` port) with a Supabase adapter. |
| `../../scripts/import-ipos-eod.ts` | Manual CLI: store + JSON → parse → applyStamps → summary. |

## Running the import

```bash
# parse-only, no DB writes — safe before the migration is applied:
npm run import:ipos -- --store HN --file ./iPOS-RAW_C03_HN_2026-05.json --dry-run

# real import (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
npm run import:ipos -- --store HN --file ./iPOS-RAW_C03_HN_2026-05.json
```

Re-running the same file imports **0** new stamps (idempotent on `tran_id`).

Expected HN May 2026 sanity: ~1,799 read → ~123 attributable → ~123 stamps →
~60 customers (a few heavy customers roll past 8 onto a 2nd/3rd card).

## Schema dependency — `2026-06-08_ipos-eod-stamp-sync.sql`

`applyStamps` targets a migrated schema. **The migration is gated on Hiếu's
confirmation** (see the SQL file header). It does two things the base schema
can't:

1. **Idempotency** — `stamp_entries.ipos_tran_id` (unique) + `source`.
2. **Phone-only cards** — `stamp_cards.user_id` becomes nullable and gains a
   `phone` column, because only ~2 of ~60 iPOS customers have a web account.
   A card is owned by a user when the phone is registered, otherwise recorded
   against the phone alone and back-filled to the user at signup.

## Scope

In: dine-in / takeaway orders where staff keyed a real phone (~7% of orders).
Out (per task): automated Hub API pull (TSK-151), redemption, GrabFood/online
attribution, production backfill of May data, the stamp UI (TSK-147).
