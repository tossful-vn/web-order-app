/**
 * "Lá" chatbot — Layer B static content (TSK-173 PR2).
 *
 * EVERYTHING here is canned, deterministic copy: onboarding feature cards + FAQ.
 * There is NO LLM and NO external call anywhere in the chatbot — Lá only ever
 * shows this static content or looks up the customer's OWN app data (Layer A:
 * live menu, stamp card, saved bowls, community aggregate). See spec §1/§2.
 *
 * HARD RULES baked into this file (spec §2):
 *   - NO recipe / proportion / technique data. Cards describe FEATURES, not how a
 *     bowl is made. Do not add gram amounts, ratios, or prep steps here.
 *   - NO allergen Q&A. The one allergen-shaped FAQ entry deliberately answers with
 *     the staff-redirect line — allergen data is not ready (see ALLERGEN_REDIRECT).
 *
 * Store-specific facts (address / phone / hours) live in STORE_INFO so Hieu can
 * edit them in ONE place.
 */
import type { Lang } from "@/lib/lang";

/** Bilingual string. */
export type I18n = { vi: string; en: string };

const t = (vi: string, en: string): I18n => ({ vi, en });

/** Read a bilingual value for the active language. */
export function pick(s: I18n, lang: Lang): string {
  return lang === "vi" ? s.vi : s.en;
}

/* ─────────────────────────── Store facts ───────────────────────────
 * CH1 = Hà Nội, CH2 = HCM (see lib/ipos/importEod.ts STORE_CODES). */
export const STORE_INFO = {
  ch1: {
    code: "CH1",
    city: t("Hà Nội", "Hanoi"),
    address: t(
      "B1 - Capital Place, 29 Liễu Giai, Ba Đình, Hà Nội",
      "B1 - Capital Place, 29 Lieu Giai, Ba Dinh, Hanoi",
    ),
    phone: "082.856.5166",
  },
  ch2: {
    code: "CH2",
    city: t("TP. Hồ Chí Minh", "Ho Chi Minh City"),
    address: t(
      "A1.10 Galleria Residences, Metropole Thủ Thiêm, TP.HCM",
      "A1.10 Galleria Residences, Metropole Thu Thiem, HCMC",
    ),
    phone: "082.545.0768",
  },
  hours: t(
    "09:00 – 20:30 mỗi ngày (cả hai cửa hàng).",
    "09:00 – 20:30 every day (both stores).",
  ),
} as const;

/** The fixed reply for any allergen / dietary-safety question (spec §2). */
export const ALLERGEN_REDIRECT: I18n = t(
  "Để chắc chắn, hỏi nhân viên giúp em nhé — thông tin dị ứng em chưa nắm đủ.",
  "To be safe, please ask our staff — I don't have full allergen info yet.",
);

/* ─────────────────────────── Onboarding ───────────────────────────
 * Layer B feature guide. Each card introduces ONE app feature. Optional `href`
 * deep-links into that feature. Feature copy only — never recipes. */
export type OnboardingCard = {
  key: string;
  /** Tabler icon name (e.g. "ti-salad"). */
  icon: string;
  title: I18n;
  body: I18n;
  href?: string;
  cta?: I18n;
};

export const ONBOARDING_CARDS: OnboardingCard[] = [
  {
    key: "byo",
    icon: "ti-salad",
    title: t("Tự tạo bowl (BYO)", "Build your own bowl"),
    body: t(
      "Chọn cơ bản, đạm, topping và sốt — Lá hiện ngay calo và dinh dưỡng. Chạm vào từng nguyên liệu để xem thông tin.",
      "Pick a base, protein, toppings and dressing — Lá shows calories and nutrition live. Tap any ingredient to learn about it.",
    ),
    href: "/nutrition",
    cta: t("Mở máy tính dinh dưỡng", "Open the calculator"),
  },
  {
    key: "saved",
    icon: "ti-bookmark",
    title: t("Bowl đã lưu", "Saved bowls"),
    body: t(
      "Lưu lại bowl bạn thích để xem lại và gọi nhanh lần sau, không cần dựng lại từ đầu.",
      "Save the bowls you love so you can revisit and reorder them fast — no rebuilding from scratch.",
    ),
    href: "/account",
    cta: t("Xem bowl đã lưu", "View saved bowls"),
  },
  {
    key: "stamp",
    icon: "ti-stamp",
    title: t("Thẻ stamp", "Stamp card"),
    body: t(
      "Mỗi lần ghé là một dấu. Đủ 9 dấu, phần thứ 10 miễn phí. Dấu tự cộng khi bạn đã xác minh số điện thoại.",
      "Each visit earns a stamp. Collect 9 and your 10th item is free. Stamps add automatically once your phone is verified.",
    ),
    href: "/loyalty",
    cta: t("Mở thẻ stamp", "Open stamp card"),
  },
  {
    key: "week",
    icon: "ti-calendar",
    title: t("Tuần của tôi", "My Week"),
    body: t(
      "Lên kế hoạch bowl cho cả tuần và theo dõi vòng dinh dưỡng mỗi ngày.",
      "Plan your bowls for the week and track your daily nutrition rings.",
    ),
    href: "/byw",
    cta: t("Lên kế hoạch tuần", "Plan my week"),
  },
  {
    key: "pickup",
    icon: "ti-moped",
    title: t("Nhận tại quầy hay giao Ahamove", "Pickup or Ahamove delivery"),
    body: t(
      "Ghé lấy tại cửa hàng, hoặc đặt giao tận nơi qua Ahamove trong khu vực phục vụ.",
      "Grab it at the counter, or get it delivered via Ahamove within the service area.",
    ),
  },
];

/* ─────────────────────────────── FAQ ───────────────────────────────
 * Canned answers only (Layer B). The allergen entry intentionally redirects to
 * staff. Stamp/membership answers are derived from the real loyalty rules. */
export type FaqEntry = {
  key: string;
  q: I18n;
  a: I18n;
  href?: string;
  cta?: I18n;
};

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    key: "hours",
    q: t("Giờ mở cửa?", "Opening hours?"),
    a: STORE_INFO.hours,
  },
  {
    key: "address",
    q: t("Địa chỉ cửa hàng?", "Store addresses?"),
    a: t(
      `[Hà Nội] ${STORE_INFO.ch1.address.vi} · ☎ ${STORE_INFO.ch1.phone}\n[TP.HCM] ${STORE_INFO.ch2.address.vi} · ☎ ${STORE_INFO.ch2.phone}`,
      `[Hanoi] ${STORE_INFO.ch1.address.en} · ☎ ${STORE_INFO.ch1.phone}\n[HCMC] ${STORE_INFO.ch2.address.en} · ☎ ${STORE_INFO.ch2.phone}`,
    ),
  },
  {
    key: "delivery",
    q: t("Khu vực giao hàng?", "Delivery area?"),
    a: t(
      "Tossful giao qua Ahamove trong khu vực quanh cửa hàng. Nhập địa chỉ khi đặt để xem có giao tới không nhé.",
      "Tossful delivers via Ahamove around each store. Enter your address at checkout to see if you're in range.",
    ),
  },
  {
    key: "payment",
    q: t("Thanh toán thế nào?", "How can I pay?"),
    a: t(
      "Bạn quét mã QR MoMo để thanh toán, hoặc trả tại quầy khi nhận.",
      "Scan the MoMo QR code to pay, or pay at the counter on pickup.",
    ),
  },
  {
    key: "stamp",
    q: t("Thẻ stamp hoạt động ra sao?", "How does the stamp card work?"),
    a: t(
      "Mỗi phần đủ điều kiện được một dấu. Đủ 9 dấu là bạn có 1 phần thứ 10 miễn phí (chọn bowl, đạm, topping hoặc nước). Dấu tự cộng sau khi bạn xác minh số điện thoại.",
      "Each qualifying order earns a stamp. At 9 stamps you unlock a free 10th item (a bowl, protein, topping or drink). Stamps accrue automatically once your phone is verified.",
    ),
    href: "/loyalty",
    cta: t("Mở thẻ stamp", "Open stamp card"),
  },
  {
    key: "membership",
    q: t("Có gói thành viên không?", "Is there a membership?"),
    a: t(
      "Thẻ stamp là chương trình thành viên hiện tại của Tossful. Các đặc quyền thành viên mở rộng đang được chuẩn bị — Lá sẽ báo khi có nhé.",
      "The stamp card is Tossful's current membership perk. Extended member benefits are in the works — Lá will let you know when they land.",
    ),
  },
  {
    key: "allergen",
    q: t("Món có gây dị ứng không?", "Any allergens I should know about?"),
    a: ALLERGEN_REDIRECT,
  },
];
