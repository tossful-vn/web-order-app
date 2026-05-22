import { NextResponse } from "next/server";
import { claimBowl } from "@/lib/bowls/actions";

/**
 * POST /api/bowls/claim
 * Body: a JSON blob held in localStorage from a guest session.
 *
 * Used by the GuestBowlClaim client component that runs once on /account
 * mount after a fresh login.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await claimBowl(payload);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ id: result.id });
}
