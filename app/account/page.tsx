import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/lang-server";
import HeartToggle from "./HeartToggle.client";
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
    must_try_add: "Mark as Must Try",
    must_try_remove: "Remove from Must Try",
    section_must_try: "Must Try",
    section_saved_bowls: "All saved bowls",
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
    must_try_add: "Đánh dấu Phải thử",
    must_try_remove: "Bỏ khỏi Phải thử",
    section_must_try: "Phải thử",
    section_saved_bowls: "Tất cả bowl đã lưu",
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
  is_favourite: boolean | null;
  created_at: string;
};

export default async function AccountPage() {
  const lang = getServerLang();
  const s = STRINGS[lang];
  const supabase = createClient();
  // Favourites first, then newest. is_favourite desc puts true (1) before false (0).
  const { data: bowls } = await supabase
    .from("saved_bowls")
    .select("id, name, kcal, protein_g, fat_g, carbs_g, fibre_g, is_favourite, created_at")
    .order("is_favourite", { ascending: false })
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
        <div className="border border-dashed border-kale-200 rounded-2xl p-10 text-center flex flex-col items-center">
          <img
            src="/brand/tossful-mascot.png"
            alt=""
            aria-hidden="true"
            className="w-[200px] h-auto mb-4 select-none"
          />
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
        (() => {
          const favs = list.filter((b) => b.is_favourite === true);
          const rest = list.filter((b) => b.is_favourite !== true);
          const renderCard = (b: BowlRow) => {
            const totals = {
              cal: Number(b.kcal ?? 0),
              protein: Number(b.protein_g ?? 0),
              fat: Number(b.fat_g ?? 0),
              carbs: Number(b.carbs_g ?? 0),
              fibre: Number(b.fibre_g ?? 0),
            };
            const isFav = b.is_favourite === true;
            return (
              <li key={b.id} className="relative">
                <Link
                  href={`/account/bowls/${b.id}`}
                  className="block border border-kale-100 rounded-xl p-4 hover:border-kale-300 hover:shadow-sm transition h-full"
                >
                  <div className="font-medium text-kale-700 mb-3 line-clamp-1 pr-12">
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
                <div className="absolute top-3 right-3 z-10">
                  <HeartToggle
                    id={b.id}
                    initialIsFavourite={isFav}
                    addLabel={s.must_try_add}
                    removeLabel={s.must_try_remove}
                  />
                </div>
              </li>
            );
          };
          return (
            <>
              {favs.length > 0 && (
                <section>
                  <h2 className="font-display italic text-2xl text-kale-700 mb-4 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#F68C02" stroke="#F68C02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {s.section_must_try}
                    <span className="text-sm font-body text-kale-500 not-italic">({favs.length})</span>
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favs.map(renderCard)}
                  </ul>
                </section>
              )}
              {rest.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl text-kale-700 mb-4">
                    {favs.length > 0 ? s.section_saved_bowls : s.title}
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rest.map(renderCard)}
                  </ul>
                </section>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}
