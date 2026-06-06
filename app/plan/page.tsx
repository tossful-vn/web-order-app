import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { loadPlan } from "@/lib/byw";
import { loadSignatureMacros } from "@/lib/signatures";
import { normalizeWeek, addWeeks } from "@/lib/byw-week";
import PlanClient from "./PlanClient.client";
import type { SavedBowlMin } from "./types";
import "./plan.css";

export const metadata = { title: "Plan cua toi - Tossful" };

export default async function PlanPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const supabase = createClient();
  const user = await requireUser("/login?next=/plan");
  const weekStart = normalizeWeek(searchParams?.week);

  // All five reads are independent — fire them together.
  const [profileRes, savedBowlsRes, signatures, plan, prevPlan] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("saved_bowls")
      .select("id, name, kcal, protein_g, fat_g, carbs_g, fibre_g, is_favourite")
      .eq("user_id", user.id)
      .order("is_favourite", { ascending: false })
      .order("created_at", { ascending: false }),
    loadSignatureMacros(),
    loadPlan(weekStart),
    loadPlan(addWeeks(weekStart, -1)),
  ]);

  const displayName = (profileRes.data?.display_name as string | null) ?? null;
  const savedBowls = (savedBowlsRes.data ?? []) as SavedBowlMin[];

  return (
    <PlanClient
      key={weekStart}
      weekStart={weekStart}
      displayName={displayName}
      initialSlots={plan?.slots ?? {}}
      prevWeekSlots={prevPlan?.slots ?? null}
      savedBowls={savedBowls}
      signatures={signatures}
    />
  );
}
