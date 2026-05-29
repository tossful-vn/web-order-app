import { getServerLang } from "@/lib/lang-server";
import { getActiveStampCard } from "@/lib/loyalty";
import StampCard from "@/app/account/StampCard.client";

const STRINGS = {
  en: {
    page_title: "My Tossful",
    intro: "Earn a stamp every time you order. Collect 8 to redeem a free reward.",
    metadata_title: "My Tossful · Tossful",
  },
  vi: {
    page_title: "My Tossful",
    intro: "Mỗi đơn hàng nhận một stamp. Sưu tầm đủ 8 để đổi phần thưởng miễn phí.",
    metadata_title: "My Tossful · Tossful",
  },
} as const;

export async function generateMetadata() {
  const s = STRINGS[getServerLang()];
  return { title: s.metadata_title };
}

export default async function LoyaltyPage() {
  const lang = getServerLang();
  const s = STRINGS[lang];
  const stampData = await getActiveStampCard();

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto w-full">
      <section>
        <h1 className="font-display italic text-4xl text-kale-700 mb-2">{s.page_title}</h1>
        <p className="text-kale-600 text-sm">{s.intro}</p>
      </section>

      <StampCard
        card={stampData?.card ?? null}
        entries={stampData?.entries ?? []}
        lang={lang}
      />
    </div>
  );
}
