import { getServerLang } from "@/lib/lang-server";
import { getStampCardView } from "@/lib/loyalty";
import StampCard from "@/app/account/StampCard.client";

const STRINGS = {
  en: {
    page_title: "My Tossful",
    intro: "Earn 1 stamp per order. Collect 9 and your 10th item is free.",
    metadata_title: "My Tossful · Tossful",
  },
  vi: {
    page_title: "My Tossful",
    intro: "Mỗi đơn nhận 1 dấu. Đủ 9 dấu, món thứ 10 miễn phí.",
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
  const { card, entries, hasVerifiedPhone, isTester } = await getStampCardView();

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto w-full">
      <section>
        <h1 className="font-display italic text-4xl text-kale-700 mb-2">{s.page_title}</h1>
        <p className="text-kale-600 text-sm">{s.intro}</p>
      </section>

      <StampCard
        card={card}
        entries={entries}
        hasVerifiedPhone={hasVerifiedPhone}
        isTester={isTester}
        lang={lang}
      />
    </div>
  );
}
