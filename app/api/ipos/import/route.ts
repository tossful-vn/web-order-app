/**
 * POST /api/ipos/import — protected iPOS EOD import (TSK-151, Part 1).
 *
 * Wraps the existing parse/apply pipeline (TSK-148/153/155) as an HTTP route so
 * the nightly EOD job and the one-time May backfill can import a C03 JSON
 * without a local script run. Runs SERVER-SIDE with the service-role client
 * (bypasses RLS); the key never leaves the server.
 *
 * Auth:   Authorization: Bearer <EOD_IMPORT_SECRET>  (else 401).
 * Body:   { store: "HN" | "HCM", orders: <C03 data array> }
 *         — accepts gzip (Content-Encoding: gzip) for large monthly files.
 * Result: an IposImportSummary. Fully idempotent — re-POSTing a day is safe.
 */
import { NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseImportStores,
  isIposStoreKey,
  runIposImport,
  StoreNotFoundError,
} from "@/lib/ipos/importEod";

// Node runtime: needs the service-role client, Buffer and zlib (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Monthly backfills can be large; give the import room beyond the default.
export const maxDuration = 300;

/** Constant-time bearer comparison (avoids leaking the secret via timing). */
function bearerMatches(token: string, secret: string): boolean {
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  // 1. Auth. A missing server secret is a misconfiguration, not an open door.
  const secret = process.env.EOD_IMPORT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Import endpoint is not configured (EOD_IMPORT_SECRET unset)" },
      { status: 503 },
    );
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !bearerMatches(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Read + decode the body (gzip-aware so big C03 files fit the request cap).
  let body: unknown;
  try {
    const buf = Buffer.from(await request.arrayBuffer());
    const encoding = request.headers.get("content-encoding")?.toLowerCase() ?? "";
    const text = encoding.includes("gzip")
      ? gunzipSync(buf).toString("utf8")
      : buf.toString("utf8");
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const { store, orders } = body as { store?: unknown; orders?: unknown };
  if (!isIposStoreKey(store)) {
    return NextResponse.json(
      { error: 'Field "store" must be "HN" or "HCM"' },
      { status: 400 },
    );
  }
  if (orders === undefined || orders === null) {
    return NextResponse.json(
      { error: 'Field "orders" (the C03 data array) is required' },
      { status: 400 },
    );
  }

  // 3. Run the pipeline server-side with the service-role client.
  try {
    const stores = createSupabaseImportStores(createAdminClient());
    const summary = await runIposImport(stores, store, orders);
    return NextResponse.json(summary);
  } catch (e) {
    if (e instanceof StoreNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    const message = e instanceof Error ? e.message : "iPOS import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
