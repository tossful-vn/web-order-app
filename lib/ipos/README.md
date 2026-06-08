# iPOS EOD → Magic Stamp sync (TSK-148)

Turns an iPOS end-of-day order export (C03 "hoá đơn theo thời gian") into Magic
Stamps. Magic Stamps are **for web-account holders only** — a customer's stamps
start once they sign up with a verified mobile. The stamp UI (TSK-147) renders
what this populates.

## Eligibility rule

An iPOS order earns one stamp only when **both** hold:

1. **Registered + verified** — the order's phone matches a `profiles` row. In
   this app `profiles.phone` is set *only* by the OTP-verified signup / reset
   flow (profile editing touches `contact_phone`, never the identity `phone`),
   so a matching row means the mobile is verified.
2. **Post-signup** — the order's `tran_date` is on/after the account's
   `profiles.created_at` (its signup moment). Pre-signup orders don't count.

Orders from unregistered/unverified phones, or placed before signup, are
skipped. There are no phone-only cards.

## Modules

| File | Role |
|---|---|
| `normalizePhone.ts` | iPOS `84…` phone → canonical `0XXXXXXXXX` key. Reuses `lib/auth/phone`'s `isValidVnPhone` so iPOS phones and web-account phones collide on one key. |
| `parseEodOrders.ts` | Pure EOD JSON → phone-attributable orders (`{tran_id, store_id, phone, tran_date, tran_no}`) + drop/stat breakdown. Maps `store_uid` → `stores.id`. No DB. |
| `applyStamps.ts` | Per order: enforce the eligibility rule, find/create the user's stamp card, insert one stamp. Idempotent on `tran_id`. DB-agnostic `StampStore` port + Supabase adapter. |
| `../../scripts/import-ipos-eod.ts` | Manual CLI: store + JSON → parse → applyStamps → summary. |

## Running the import

```bash
# parse-only, no DB writes:
npm run import:ipos -- --store HN --file ./iPOS-RAW_C03_HN_2026-05.json --dry-run

# real import (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
npm run import:ipos -- --store HN --file ./iPOS-RAW_C03_HN_2026-05.json
```

Re-running the same file imports **0** new stamps (idempotent on `tran_id`).

Summary fields: read · attributable (phone present) · inserted · skipped
(existing / no-account / pre-signup) · new cards.

## Schema — `2026-06-08_ipos-eod-stamp-sync.sql`

Just adds `stamp_entries.ipos_tran_id` (unique partial index) + `source`
(default `'manual'` so the existing 18 rows are labelled as such; iPOS inserts
pass `'ipos_eod'`). `stamp_cards` keeps its base shape (`user_id NOT NULL`) —
every stamp belongs to a web account.

## Scope

In: dine-in / takeaway orders whose phone belongs to a registered + verified
web account, placed after signup. Out (per task): automated Hub API pull
(TSK-151), redemption, GrabFood/online attribution, production backfill of May
data, the stamp UI (TSK-147).
