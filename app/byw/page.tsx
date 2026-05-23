import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { ensureDraftWeek } from "@/lib/weeks/actions";
import Planner from "./Planner.client";
import "./byw.css";

export const metadata = { title: "Tuần của tôi · Tossful" };

export default async function BywPage() {
  const user = await requireUser();
  const supabase = createClient();

  const weekRes = await ensureDraftWeek();
  if ("error" in weekRes) {
    throw new Error(weekRes.error);
  }
  const weekId = weekRes.id;

  // Fetch joined week_items
  const { data: rawItems, error: itemsErr } = await supabase
    .from("week_items")
    .select(
      `id, week_id, user_id, day_index, item_kind, bowl_id, addon_id,
       custom_name, custom_kcal, custom_protein_g, custom_fat_g, custom_carbs_g, custom_fibre_g,
       sort_order,
       bowl:saved_bowls(id, name, kcal, protein_g, fat_g, carbs_g, fibre_g),
       addon:addons(id, kind, name_en, name_vn, kcal, protein_g, fat_g, carbs_g, fibre_g)`,
    )
    .eq("week_id", weekId)
    .order("day_index", { ascending: true })
    .order("sort_order", { ascending: true });
  if (itemsErr) throw new Error(itemsErr.message);

  // Saved bowls for the picker
  const { data: savedBowls } = await supabase
    .from("saved_bowls")
    .select("id, name, kcal, protein_g, fat_g, carbs_g, fibre_g")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Addons catalog
  const { data: addons } = await supabase
    .from("addons")
    .select("id, kind, name_en, name_vn, kcal, protein_g, fat_g, carbs_g, fibre_g")
    .eq("active", true)
    .eq("in_menu", true)
    .order("sort_order", { ascending: true });

  // Normalize supabase relational result: `bowl` and `addon` may come as arrays
  // depending on PostgREST relation cardinality. Coerce to single object or null.
  type RawItem = {
    id: string; week_id: string; user_id: string; day_index: number;
    item_kind: "bowl" | "drink" | "food" | "custom";
    bowl_id: string | null; addon_id: string | null;
    custom_name: string | null; custom_kcal: number | null;
    custom_protein_g: number | null; custom_fat_g: number | null;
    custom_carbs_g: number | null; custom_fibre_g: number | null;
    sort_order: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bowl: any; addon: any;
  };
  const items = ((rawItems ?? []) as RawItem[]).map((it) => ({
    ...it,
    bowl: Array.isArray(it.bowl) ? (it.bowl[0] ?? null) : (it.bowl ?? null),
    addon: Array.isArray(it.addon) ? (it.addon[0] ?? null) : (it.addon ?? null),
  }));

  return (
    <Planner
      weekId={weekId}
      items={items}
      savedBowls={(savedBowls ?? []) as Parameters<typeof Planner>[0]["savedBowls"]}
      addons={(addons ?? []) as Parameters<typeof Planner>[0]["addons"]}
    />
  );
}
