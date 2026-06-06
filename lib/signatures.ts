import { createClient } from "@/lib/supabase/server";

/**
 * A signature bowl with macros aggregated from its recipe components.
 * (Same shape the /byw page computes inline; extracted here so /plan can reuse
 * it without touching the existing planner. TSK-118.)
 */
export type SignatureWithMacros = {
  id: string;
  name_en: string;
  name_vn: string | null;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fibre_g: number;
};

/**
 * Load the in-menu signature bowls and compute per-bowl macros by summing each
 * recipe component's nutrition scaled to its gram quantity. Returns [] if there
 * are no signatures. Throws nothing — missing nutrition rows just contribute 0.
 */
export async function loadSignatureMacros(): Promise<SignatureWithMacros[]> {
  const supabase = createClient();

  const { data: sigItems } = await supabase
    .from("items")
    .select("id, name_en, name_vn")
    .eq("in_menu", true)
    .eq("active", true)
    .eq("category", "Signature")
    .order("name_en", { ascending: true });

  if (!sigItems || sigItems.length === 0) return [];

  const sigIds = sigItems.map((s) => s.id);
  const { data: comps } = await supabase
    .from("recipe_components")
    .select("recipe_id, component_id, quantity_g")
    .in("recipe_id", sigIds);

  const componentIds = Array.from(new Set((comps ?? []).map((c) => c.component_id)));
  const { data: nutritions } = await supabase
    .from("item_nutrition")
    .select("item_id, calories, protein_g, total_fat_g, carbs_g, fiber_g")
    .in(
      "item_id",
      componentIds.length > 0 ? componentIds : ["00000000-0000-0000-0000-000000000000"]
    );

  type Nut = {
    item_id: string;
    calories: number | null;
    protein_g: number | null;
    total_fat_g: number | null;
    carbs_g: number | null;
    fiber_g: number | null;
  };
  const nutById = new Map<string, Nut>();
  for (const n of (nutritions ?? []) as Nut[]) nutById.set(n.item_id, n);

  return sigItems.map((sig) => {
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
