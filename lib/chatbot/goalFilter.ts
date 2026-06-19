/**
 * "Lá" chatbot — goal filter over the live menu projection (Layer A, TSK-173 PR2).
 *
 * Pure, deterministic ranking of customer-facing menu items by a nutrition goal.
 * The widget fetches `items` + `item_nutrition` from Supabase (the same public
 * menu projection the calculator uses) and hands the joined rows here.
 *
 * Spec §2 boundary: this ranks WHOLE menu items by their published macros. It
 * carries NO recipe / proportion / technique data — only names, category, and the
 * two macros the goals need.
 *
 * Goals shipped: high-protein ("nhiều đạm") and low-calorie ("ít calo").
 * The vegetarian ("chay") goal is intentionally NOT here — the menu has no
 * veg/dietary tags, and spec §"Goal filter" says hide that button when the tags
 * don't exist. Add it here (and the button) only once tags land.
 */

/** A customer-facing menu item with the macros the goal filter needs. */
export type MenuItem = {
  id: string;
  name_en: string;
  name_vn: string | null;
  category: string;
  calories: number | null;
  protein_g: number | null;
};

export type Goal = "protein" | "lowcal";

/**
 * Rank menu items for a goal.
 *   - "protein": items with a protein value, highest first.
 *   - "lowcal":  items with a calorie value, lowest first.
 * Items missing the relevant macro are dropped (can't rank them). Ties break by
 * name for a stable, deterministic order. Returns at most `limit` items.
 */
export function filterByGoal(
  items: MenuItem[],
  goal: Goal,
  limit = 5,
): MenuItem[] {
  const max = Math.max(limit, 0);

  if (goal === "protein") {
    return items
      .filter((i) => i.protein_g != null)
      .sort(
        (a, b) =>
          (b.protein_g as number) - (a.protein_g as number) ||
          a.name_en.localeCompare(b.name_en),
      )
      .slice(0, max);
  }

  // lowcal
  return items
    .filter((i) => i.calories != null)
    .sort(
      (a, b) =>
        (a.calories as number) - (b.calories as number) ||
        a.name_en.localeCompare(b.name_en),
    )
    .slice(0, max);
}
