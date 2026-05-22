# Tossful Web Order

Customer-facing web app for Tossful Salad Bar. Single Next.js codebase that serves two production domains:

- **order.tossful.vn** — customer ordering (pickup + online payment, v1)
- **nutrition.tossful.vn** — public nutrition calculator (mirrors `/nutrition` route)

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (Tossful brand theme — kale palette, Fraunces + Questrial fonts)
- Supabase (Postgres + Auth + Storage + Realtime)
- Vercel hosting, auto-deploy on push to `main`

## Local setup

You don't need to run this locally to deploy — Vercel builds in the cloud. But if you want to:

1. Install Node.js 20+
2. `cp .env.local.example .env.local` and fill in real Supabase keys
3. `npm install`
4. `npm run dev` → opens at http://localhost:3000

## Deploy flow

1. Push to `main` branch on GitHub
2. Vercel auto-detects Next.js, builds, deploys in ~2 min
3. Environment variables are managed in the Vercel dashboard

## Project structure

```
app/                    Next.js App Router pages
  layout.tsx            Root layout (fonts, brand theme)
  page.tsx              Landing page
  globals.css           Tailwind directives
lib/
  supabase/
    client.ts           Browser Supabase client
    server.ts           Server-side Supabase client (with cookies)
```

## Build steps

> **Naming note.** The numbered items below are *internal build steps inside this codebase*. They are **not** the master web roadmap phases. The canonical phase map lives in the project memory `tossful-web-roadmap` and is:
>
> - **Phase 1** — Nutrition Calculator (shipped)
> - **Phase 2** — Membership + Build Your Week ← *we are building this now*
> - **Phase 3** — Separate web order app (BYW + B2B, prepayment only)
> - **Phase 4** — Full iPOS integration (parked)
>
> The steps below are the chronological work-units inside this Next.js app:

- **Step 0** — skeleton + deploy pipeline ✅
- **Step 1** *(Phase 2 → in progress)* — Supabase Auth: email magic link + Google OAuth
- **Step 2** *(Phase 2)* — `/account` profile + saved bowls
- **Step 3** *(Phase 2)* — `/byw` Build Your Week + `/byw/reserve` soft pre-order intent
- **Step 4** *(Phase 2)* — migrate `/nutrition` calculator off Netlify into this app
- **Step 5** *(Phase 3)* — `/order` catalog (BYW + B2B SKUs)
- **Step 6** *(Phase 3)* — `/order/checkout` with MoMo + VNPay
- **Step 7** *(Phase 3)* — `/kitchen` scheduled-orders view
- **Step 8** — `/admin` for Hieu + TA to manage menu/orders
