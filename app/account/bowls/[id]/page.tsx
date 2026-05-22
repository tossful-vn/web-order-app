import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renameBowl, deleteBowl } from "@/lib/bowls/actions";
import type { SavedBowl } from "@/lib/types/database";

export const metadata = { title: "Bowl · Tossful" };

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
  const allItems = [
    comp.base ? [{ ...comp.base, group: "Cốt" }] : [],
    (comp.proteins ?? []).map((x) => ({ ...x, group: "Đạm" })),
    (comp.toppings ?? []).map((x) => ({ ...x, group: "Topping" })),
    comp.dressing ? [{ ...comp.dressing, group: "Sốt" }] : [],
    comp.cot ? [{ ...comp.cot, group: "Cốt thêm" }] : [],
    comp.xot ? [{ ...comp.xot, group: "Xốt" }] : [],
  ].flat();

  const macroRow = (label: string, value: number | null, unit: string) => (
    <div className="flex justify-between text-sm py-2 border-b border-kale-50">
      <span className="text-kale-600">{label}</span>
      <span className="text-kale-800 font-medium">
        {value == null ? "—" : `${Math.round(Number(value))} ${unit}`}
      </span>
    </div>
  );

  return (
    <div className="space-y-8">
      <nav className="text-sm text-kale-500">
        <Link href="/account" className="hover:text-kale-700">
          ← Tất cả bowl của bạn
        </Link>
      </nav>

      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-2">{b.name}</h1>
        <p className="text-xs text-kale-500">
          Lưu lúc {new Date(b.created_at).toLocaleString("vi-VN")}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <section>
          <h2 className="font-display text-xl text-kale-700 mb-3">Thành phần</h2>
          {allItems.length === 0 ? (
            <p className="text-sm text-kale-500">
              Bowl này không có dữ liệu thành phần chi tiết.
            </p>
          ) : (
            <ul className="border border-kale-100 rounded-xl divide-y divide-kale-50">
              {allItems.map((it, i) => (
                <li
                  key={i}
                  className="px-4 py-3 flex justify-between items-center"
                >
                  <div>
                    <div className="text-kale-800">{it.name}</div>
                    <div className="text-xs text-kale-500">{it.group}</div>
                  </div>
                  <div className="text-sm text-kale-600">{it.grams}g</div>
                </li>
              ))}
            </ul>
          )}
          {comp.notes && (
            <p className="mt-4 text-sm text-kale-600 italic">"{comp.notes}"</p>
          )}
        </section>

        <aside className="border border-kale-100 rounded-2xl p-5 h-fit">
          <h2 className="font-display text-xl text-kale-700 mb-3">
            Dinh dưỡng
          </h2>
          {macroRow("Calo", b.kcal, "kcal")}
          {macroRow("Protein", b.protein_g, "g")}
          {macroRow("Chất béo", b.fat_g, "g")}
          {macroRow("Tinh bột", b.carbs_g, "g")}
          {macroRow("Chất xơ", b.fibre_g, "g")}
          {macroRow("Natri", b.sodium_mg, "mg")}
        </aside>
      </div>

      <section className="border-t border-kale-100 pt-8 space-y-6">
        <div>
          <h3 className="font-display text-lg text-kale-700 mb-2">Đổi tên</h3>
          <form action={renameBowl} className="flex gap-2">
            <input type="hidden" name="id" value={b.id} />
            <input
              name="name"
              defaultValue={b.name}
              className="flex-1 px-4 py-2 border border-kale-200 rounded-lg"
            />
            <button className="bg-kale-700 text-white px-4 py-2 rounded-lg">
              Lưu
            </button>
          </form>
        </div>

        <div>
          <h3 className="font-display text-lg text-kale-700 mb-2">Xóa bowl</h3>
          <form action={deleteBowl}>
            <input type="hidden" name="id" value={b.id} />
            <button className="text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50">
              Xóa vĩnh viễn
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
