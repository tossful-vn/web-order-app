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

## Build phases

- **Phase 1** (current) — skeleton + deploy pipeline ✅
- Phase 2 — Auth (signup/login, my-orders, saved addresses)
- Phase 3 — Menu + cart + checkout (no payment)
- Phase 4 — MoMo + VNPay integration
- Phase 5 — Kitchen view + order tracking
- Phase 6 — Polish + soft launch
