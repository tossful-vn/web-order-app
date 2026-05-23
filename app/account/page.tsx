import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/lang-server";
import MacroPanel from "@/lib/components/MacroPanel";
import GuestBowlClaim from "./guest-bowl-claim";

const STRINGS = {
  en: {
    title: "Your bowls",
    intro_pre: "Every bowl you build in the nutrition calculator lands here — ready to slot into ",
    intro_link: "My week",
    empty_h: "No saved bowls yet.",
    empty_p: 'Build your first bowl and tap "Save" — then come back here to plan your week.',
    empty_cta: "Open nutrition calculator",
    panel_label: "% of daily target",
    macro_labels: { cal: "CAL", protein: "PROTEIN", fat: "FAT", carbs: "CARBS", fiber: "FIBER" },
    metadata_title: "Your bowls · Tossful",
  },
  vi: {
    title: "Bowl của bạn",
    intro_pre: "Mỗi bowl bạn xây trong máy tính dinh dưỡng đều được lưu ở đây — sẵn sàng để xếp vào ",
    intro_link: "Tuần của tôi",
    empty_h: "Bạn chưa lưu bowl nào.",
    empty_p: 'Xây bowl đầu tiên rồi bấm "Lưu" — sau đó quay lại đây để xếp tuần.',
    empty_cta: "Mở máy tính dinh dưỡng",
    panel_label: "% mục tiêu hôm nay",
    macro_labels: { cal: "CAL", protein: "ĐẠM", fat: "BÉO", carbs: "T.BỘT", fiber: "C.XƠ" },
    metadata_title: "Bowl của bạn · Tossful",
  },
} as const;

export async function generateMetadata() {
  const s = STRINGS[getServerLang()];
  return { title: s.metadata_title };
}

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
  const lang = getServerLang();
  const s = STRINGS[lang];
  const supabase = createClient();
  const { data: bowls } = await supabase
    .from("saved_bowls")
    .select("id, name, kcal, protein_g, fat_g, carbs_g, fibre_g, created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  const list = (bowls ?? []) as BowlRow[];
  const dateLocale = lang === "vi" ? "vi-VN" : "en-GB";

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto w-full">
      <GuestBowlClaim />

      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-2">{s.title}</h1>
        <p className="text-kale-600 text-sm">
          {s.intro_pre}
          <Link href="/byw" className="underline">{s.intro_link}</Link>.
        </p>
      </section>

      {list.length === 0 ? (
        <div className="border border-dashed border-kale-200 rounded-2xl p-10 text-center">
          <p className="text-kale-700 font-medium mb-1">{s.empty_h}</p>
          <p className="text-sm text-kale-500 mb-5">{s.empty_p}</p>
          <Link
            href="/nutrition"
            className="inline-block bg-kale-700 text-white px-5 py-3 rounded-lg hover:bg-kale-800 transition"
          >
            {s.empty_cta}
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
                    label={s.panel_label}
                    macroLabels={s.macro_labels}
                  />
                  <div className="text-xs text-kale-400 mt-3">
                    {new Date(b.created_at).toLocaleDateString(dateLocale)}
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
