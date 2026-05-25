import { NextResponse } from "next/server";

/**
 * GET /api/warmup
 *
 * Lightweight ping that exists solely to keep the Vercel serverless function
 * containers warm. Triggered by the cron in vercel.json every 5 minutes.
 *
 * Why this exists (Phase A perf, MVP0):
 *   On Vercel Hobby plan, idle functions cold-start (~1-2s extra latency on
 *   the first request after a quiet period). At <20 orders/day, traffic is
 *   too sparse to keep functions warm naturally. This cron simulates traffic.
 *
 * When to delete this:
 *   At Phase C (Vercel Pro upgrade or sustained >50 req/min). Pro has lower
 *   cold-start risk + the real traffic will keep things warm. The cron slot
 *   is then better spent on a metrics flush or queue worker.
 *
 * Auth: none. Endpoint is harmless (no DB read, no mutation). If we ever
 * want to lock it to Vercel cron only, check the `Authorization: Bearer ...`
 * header against process.env.CRON_SECRET.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    purpose: "warmup",
  });
}
