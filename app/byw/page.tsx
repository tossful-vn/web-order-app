import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { ensureDraftWeek } from "@/lib/weeks/actions";
import Planner from "./Planner.client";
import "./byw.css";

export const metadata = { title: "Tuan cua toi - Tossful" };

export default async function BywPage() {
  // Batch 1 — auth + draft-week setup in parallel (both independent).
  const supabase = createClient();
  const [user, weekRes] = await Promise.all([
    requireUser(),
    ensureDraftWeek(),
  ]);
  if ("error" in weekRes) {
    throw new Error(weekRes.error);
  }
  const weekId = weekRes.id;

  // Batch 2 — fire all four independent queries in parallel.
  // Previously sequential (~4 × Supabase round-trip = 1.2-2s on cold path).
  // Now bounded by the slowest single query (~300-500ms).
  const [
    weekItemsRes,
    savedBowlsRes,
    addonsRes,
    sigItemsRes,
  ] = await Promise.all([
    supabase
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
      .order("sort_order", { ascending: true }),
    supabase
      .from("saved_bowls")
      .select("id, name, kcal, protein_g, fat_g, carbs_g, fibre_g, is_favourite")
      .eq("user_id", user.id)
      .order("is_favourite", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("addons")
      .select("id, kind, name_en, name_vn, kcal, protein_g, fat_g, carbs_g, fibre_g")
      .eq("active", true)
      .eq("in_menu", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("items")
      .select("id, name_en, name_vn, notes")
      .eq("in_menu", true)
      .eq("active", true)
      .eq("category", "Signature")
      .order("name_en", { ascending: true }),
  ]);

  const { data: rawItems, error: itemsErr } = weekItemsRes;
  if (itemsErr) throw new Error(itemsErr.message);
  const { data: savedBowls } = savedBowlsRes;
  const { data: addons } = addonsRes;
  const { data: sigItems } = sigItemsRes;

  type Signature = {
    id: string; name_en: string; name_vn: string | null;
    kcal: number; protein_g: number; fat_g: number; carbs_g: number; fibre_g: number;
  };
  let signatures: Signature[] = [];
  if (sigItems && sigItems.length > 0) {
    const sigIds = sigItems.map((s) => s.id);
    const { data: comps } = await supabase
      .from("recipe_components")
      .select("recipe_id, component_id, quantity_g")
      .in("recipe_id", sigIds);
    const componentIds = Array.from(new Set((comps ?? []).map((c) => c.component_id)));
    const { data: nutritions } = await supabase
      .from("item_nutrition")
      .select("item_id, calories, protein_g, total_fat_g, carbs_g, fiber_g")
      .in("item_id", componentIds.length > 0 ? componentIds : ["00000000-0000-0000-0000-000000000000"]);
    type Nut = { item_id: string; calories: number | null; protein_g: number | null; total_fat_g: number | null; carbs_g: number | null; fiber_g: number | null };
    const nutById = new Map<string, Nut>();
    for (const n of (nutritions ?? []) as Nut[]) nutById.set(n.item_id, n);

    signatures = sigItems.map((sig) => {
      const sigComps = (comps ?? []).filter((c) => c.recipe_id === sig.id);
      let cal = 0, protein = 0, fat = 0, carbs = 0, fibre = 0;
      for (const c of sigComps) {
        const nut = nutById.get(c.component_id);
        if (!nut) continue;
        const f = c.quantity_g / 100;
        cal += (nut.calories ?? 0) * f;
        protein += (nut.protein_g ?? 0) * f;
        fat += (nut.total_fat_g ?? 0) * f;
        carbs += (nut.carbs_g ?? 0) * f;
        fibre += (nut.fiber_g ?? 0) * f;
      }
      return {
        id: sig.id,
        name_en: sig.name_en,
        name_vn: sig.name_vn,
        kcal: Math.round(cal),
        protein_g: Number(protein.toFixed(1)),
        fat_g: Number(fat.toFixed(1)),
        carbs_g: Number(carbs.toFixed(1)),
        fibre_g: Number(fibre.toFixed(1)),
      };
    });
  }

  // Normalize embedded relations (Supabase may return as arrays for some joins)
  type RawItem = {
    id: string; week_id: string; user_id: string; day_index: number;
    item_kind: "bowl" | "drink" | "food" | "wrap" | "side" | "custom";
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
      signatures={signatures}
    />
  );
}
