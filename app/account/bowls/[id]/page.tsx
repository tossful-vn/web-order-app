import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/lang-server";
import { renameBowl, deleteBowl } from "@/lib/bowls/actions";
import type { SavedBowl } from "@/lib/types/database";
import MacroPanel from "@/lib/components/MacroPanel";

const STRINGS = {
  en: {
    metadata: "Bowl · Tossful",
    back: "← All your bowls",
    saved_at: "Saved at",
    ingredients_h: "Ingredients",
    empty_ingredients: "This bowl has no detailed ingredient data.",
    rename_h: "Rename",
    save: "Save",
    delete_h: "Delete bowl",
    delete_cta: "Delete permanently",
    panel_label: "% of daily target",
    macro_labels: { cal: "CAL", protein: "PROTEIN", fat: "FAT", carbs: "CARBS", fiber: "FIBER" },
    sections: { base: "Base", topping: "Topping", premium: "Premium", dressing: "Dressing", free: "Free" },
  },
  vi: {
    metadata: "Bowl · Tossful",
    back: "← Tất cả bowl của bạn",
    saved_at: "Lưu lúc",
    ingredients_h: "Thành phần",
    empty_ingredients: "Bowl này không có dữ liệu thành phần chi tiết.",
    rename_h: "Đổi tên",
    save: "Lưu",
    delete_h: "Xóa bowl",
    delete_cta: "Xóa vĩnh viễn",
    panel_label: "% mục tiêu hôm nay",
    macro_labels: { cal: "CAL", protein: "ĐẠM", fat: "BÉO", carbs: "T.BỘT", fiber: "C.XƠ" },
    sections: { base: "Base", topping: "Topping", premium: "Premium", dressing: "Dressing", free: "Free" },
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

type ItemEntry = { id?: string; name: string; grams: number };
type SectionMap = {
  base: ItemEntry[];
  toppings: ItemEntry[];
  proteins: ItemEntry[];
  dressing: ItemEntry[];
  free: ItemEntry[];
};

function formatGrams(g: number | string | undefined): string {
  if (g == null) return "—";
  const n = Number(g);
  if (!Number.isFinite(n)) return "—";
  return (Math.round(n * 10) / 10).toString();
}

export default async function BowlDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lang = getServerLang();
  const s = STRINGS[lang];
  const supabase = createClient();
  const { data: bowl } = await supabase
    .from("saved_bowls")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!bowl) notFound();
  const b = bowl as SavedBowl;

  const comp = b.composition ?? { schema_version: 1 };
  const sections: SectionMap = {
    base: comp.base ? [comp.base] : [],
    toppings: comp.toppings ?? [],
    proteins: comp.proteins ?? [],
    dressing: comp.dressing ? [comp.dressing] : [],
    free: [],
  };
  if (comp.cot && sections.base.length === 0) sections.base = [comp.cot];
  if (comp.xot && sections.dressing.length === 0) sections.dressing = [comp.xot];

  const totals = {
    cal: Number(b.kcal ?? 0),
    protein: Number(b.protein_g ?? 0),
    fat: Number(b.fat_g ?? 0),
    carbs: Number(b.carbs_g ?? 0),
    fibre: Number(b.fibre_g ?? 0),
  };
  const dateLocale = lang === "vi" ? "vi-VN" : "en-GB";

  const SECTION_ORDER: Array<{ key: keyof SectionMap; label: string }> = [
    { key: "base", label: s.sections.base },
    { key: "toppings", label: s.sections.topping },
    { key: "proteins", label: s.sections.premium },
    { key: "dressing", label: s.sections.dressing },
    { key: "free", label: s.sections.free },
  ];

  return (
    <div className="space-y-8 p-6 max-w-3xl mx-auto w-full">
      <nav className="text-sm text-kale-500">
        <Link href="/account" className="hover:text-kale-700">{s.back}</Link>
      </nav>

      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-2 break-words">{b.name}</h1>
        <p className="text-xs text-kale-500">
          {s.saved_at} {new Date(b.created_at).toLocaleString(dateLocale)}
        </p>
      </section>

      <MacroPanel
        totals={totals}
        label={s.panel_label}
        macroLabels={s.macro_labels}
      />

      <section>
        <h2 className="font-display text-xl text-kale-700 mb-4">{s.ingredients_h}</h2>
        {SECTION_ORDER.every((sec) => sections[sec.key].length === 0) ? (
          <p className="text-sm text-kale-500">{s.empty_ingredients}</p>
        ) : (
          <div className="space-y-5">
            {SECTION_ORDER.map((sec) => {
              const items = sections[sec.key];
              if (items.length === 0) return null;
              return (
                <div key={sec.key}>
                  <div className="text-[11px] uppercase tracking-widest text-kale-500 font-medium mb-2 border-b border-kale-100 pb-1">
                    {sec.label}
                  </div>
                  <ul className="divide-y divide-kale-50">
                    {items.map((it, i) => (
                      <li
                        key={`${sec.key}-${i}`}
                        className="px-1 py-2.5 flex justify-between items-center"
                      >
                        <span className="text-kale-800">{it.name}</span>
                        <span className="text-sm text-kale-600 font-mono">
                          {formatGrams(it.grams)}g
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        {comp.notes && (
          <p className="mt-5 text-sm text-kale-600 italic">&ldquo;{comp.notes}&rdquo;</p>
        )}
      </section>

      <section className="border-t border-kale-100 pt-8 space-y-6">
        <div>
          <h3 className="font-display text-lg text-kale-700 mb-2">{s.rename_h}</h3>
          <form action={renameBowl} className="flex gap-2">
            <input type="hidden" name="id" value={b.id} />
            <input
              name="name"
              defaultValue={b.name}
              className="flex-1 px-4 py-2 border border-kale-200 rounded-lg"
            />
            <button className="bg-kale-700 text-white px-4 py-2 rounded-lg">{s.save}</button>
          </form>
        </div>

        <div>
          <h3 className="font-display text-lg text-kale-700 mb-2">{s.delete_h}</h3>
          <form action={deleteBowl}>
            <input type="hidden" name="id" value={b.id} />
            <button className="text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50">
              {s.delete_cta}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
