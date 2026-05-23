import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renameBowl, deleteBowl } from "@/lib/bowls/actions";
import type { SavedBowl } from "@/lib/types/database";
import MacroPanel from "@/lib/components/MacroPanel";

export const metadata = { title: "Bowl - Tossful" };

const VI_MACRO_LABELS = {
  cal: "CAL",
  protein: "DAM",
  fat: "BEO",
  carbs: "T.BOT",
  fiber: "C.XO",
};

const VI_PANEL_LABEL = "% muc tieu hom nay";

// Ordered section labels — matches the calculator's category groupings.
const SECTIONS: Array<{ key: keyof SectionMap; label: string }> = [
  { key: "base", label: "Base" },
  { key: "toppings", label: "Topping" },
  { key: "proteins", label: "Premium" },
  { key: "dressing", label: "Dressing" },
  { key: "free", label: "Free" },
];

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
  // Round to 1 decimal if not integer, else integer
  return (Math.round(n * 10) / 10).toString();
}

export default async function BowlDetailPage({
  params,
}: {
  params: { id: string };
}) {
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
  // Backward-compat with older cot/xot fields (treat as base/dressing)
  if (comp.cot && sections.base.length === 0) sections.base = [comp.cot];
  if (comp.xot && sections.dressing.length === 0) sections.dressing = [comp.xot];

  const totals = {
    cal: Number(b.kcal ?? 0),
    protein: Number(b.protein_g ?? 0),
    fat: Number(b.fat_g ?? 0),
    carbs: Number(b.carbs_g ?? 0),
    fibre: Number(b.fibre_g ?? 0),
  };

  return (
    <div className="space-y-8 p-6 max-w-3xl mx-auto w-full">
      <nav className="text-sm text-kale-500">
        <Link href="/account" className="hover:text-kale-700">
          &larr; Tat ca bowl cua ban
        </Link>
      </nav>

      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-2 break-words">
          {b.name}
        </h1>
        <p className="text-xs text-kale-500">
          Luu luc {new Date(b.created_at).toLocaleString("vi-VN")}
        </p>
      </section>

      <MacroPanel
        totals={totals}
        label={VI_PANEL_LABEL}
        macroLabels={VI_MACRO_LABELS}
      />

      <section>
        <h2 className="font-display text-xl text-kale-700 mb-4">Thanh phan</h2>
        {SECTIONS.every((s) => sections[s.key].length === 0) ? (
          <p className="text-sm text-kale-500">
            Bowl nay khong co du lieu thanh phan chi tiet.
          </p>
        ) : (
          <div className="space-y-5">
            {SECTIONS.map((sec) => {
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
          <h3 className="font-display text-lg text-kale-700 mb-2">Doi ten</h3>
          <form action={renameBowl} className="flex gap-2">
            <input type="hidden" name="id" value={b.id} />
            <input
              name="name"
              defaultValue={b.name}
              className="flex-1 px-4 py-2 border border-kale-200 rounded-lg"
            />
            <button className="bg-kale-700 text-white px-4 py-2 rounded-lg">
              Luu
            </button>
          </form>
        </div>

        <div>
          <h3 className="font-display text-lg text-kale-700 mb-2">Xoa bowl</h3>
          <form action={deleteBowl}>
            <input type="hidden" name="id" value={b.id} />
            <button className="text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50">
              Xoa vinh vien
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
