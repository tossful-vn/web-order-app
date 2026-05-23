import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MacroPanel from "@/lib/components/MacroPanel";
import GuestBowlClaim from "./guest-bowl-claim";

export const metadata = { title: "Bowl cua ban - Tossful" };

const VI_MACRO_LABELS = {
  cal: "CAL",
  protein: "DAM",
  fat: "BEO",
  carbs: "T.BOT",
  fiber: "C.XO",
};

const VI_PANEL_LABEL = "% muc tieu hom nay";

type BowlRow = {
  id: string;
  name: string;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fibre_g: number | null;
  created_at: string;
};

export default async function AccountPage() {
  const supabase = createClient();
  const { data: bowls } = await supabase
    .from("saved_bowls")
    .select("id, name, kcal, protein_g, fat_g, carbs_g, fibre_g, created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  const list = (bowls ?? []) as BowlRow[];

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto w-full">
      <GuestBowlClaim />

      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-2">Bowl cua ban</h1>
        <p className="text-kale-600 text-sm">
          Moi bowl ban xay trong may tinh dinh duong deu duoc luu o day — san sang de xep vao{" "}
          <Link href="/byw" className="underline">Tuan cua toi</Link>.
        </p>
      </section>

      {list.length === 0 ? (
        <div className="border border-dashed border-kale-200 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">[salad]</div>
          <p className="text-kale-700 font-medium mb-1">Ban chua luu bowl nao.</p>
          <p className="text-sm text-kale-500 mb-5">
            Xay bowl dau tien roi bam &quot;Luu&quot; — sau do quay lai day de xep tuan.
          </p>
          <Link
            href="/nutrition"
            className="inline-block bg-kale-700 text-white px-5 py-3 rounded-lg hover:bg-kale-800 transition"
          >
            Mo may tinh dinh duong
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((b) => {
            const totals = {
              cal: Number(b.kcal ?? 0),
              protein: Number(b.protein_g ?? 0),
              fat: Number(b.fat_g ?? 0),
              carbs: Number(b.carbs_g ?? 0),
              fibre: Number(b.fibre_g ?? 0),
            };
            return (
              <li key={b.id}>
                <Link
                  href={`/account/bowls/${b.id}`}
                  className="block border border-kale-100 rounded-xl p-4 hover:border-kale-300 hover:shadow-sm transition h-full"
                >
                  <div className="font-medium text-kale-700 mb-3 line-clamp-1">
                    {b.name}
                  </div>
                  <MacroPanel
                    totals={totals}
                    label={VI_PANEL_LABEL}
                    macroLabels={VI_MACRO_LABELS}
                  />
                  <div className="text-xs text-kale-400 mt-3">
                    {new Date(b.created_at).toLocaleDateString("vi-VN")}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
