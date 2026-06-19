import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CommunityTopItem } from "@/lib/recommend/communityTopItems";

/**
 * GET /api/recommend/community?store=<uuid>&limit=<n>
 *
 * Returns the community best-sellers — "what gets ordered most" — as a no-PII
 * aggregate, powering the deterministic chatbot's community-favourites flow
 * (TSK-173 PR2) and any social-proof surface.
 *
 * Reads via the `community_top_items` SECURITY DEFINER RPC: the function reads
 * EVERY order-item row with definer rights but returns only aggregate columns,
 * so the anon/authenticated caller needs no row-level access and no PII leaks.
 * See lib/recommend/communityTopItems.ts for the mirrored reference + tests.
 *
 * Query params (both optional):
 *   store  — a stores.id uuid; omitted = all stores.
 *   limit  — 1..20, default 5.
 *
 * Cached 10 minutes at the edge (best-sellers move slowly; this also shields the
 * DB from chatbot traffic).
 */

/** Cache window: 10 minutes. */
const CACHE_SECONDS = 600;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // store: must look like a uuid, else ignore (treat as all-stores).
  const storeParam = searchParams.get("store");
  const storeId = storeParam && UUID_RE.test(storeParam) ? storeParam : null;

  // limit: clamp to 1..MAX_LIMIT, fall back to default on garbage.
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const supabase = createClient();

  const { data, error } = await supabase.rpc("community_top_items", {
    p_store_id: storeId,
    p_limit: limit,
    // p_since left to the function default (now() - 30 days).
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load community favourites" },
      { status: 500 },
    );
  }

  const items = (data ?? []) as CommunityTopItem[];

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    },
  );
}
