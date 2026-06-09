export type StampCard = {
  id: string;
  user_id: string;
  stamps_collected: number;
  reward_status: "collecting" | "reward_ready" | "redeemed";
  reward_choice: "bowl" | "protein" | "topping" | "drink" | null;
  reward_earned_at: string | null;
  reward_expires_at: string | null;
  reward_redeemed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StampEntry = {
  id: string;
  card_id: string;
  stamp_number: number;
  ingredient_key: string;
  earned_at: string;
};

export type RewardOption = {
  key: "bowl" | "protein" | "topping" | "drink";
  label_en: string;
  label_vi: string;
  desc_en: string;
  desc_vi: string;
};

export const REWARD_OPTIONS: RewardOption[] = [
  { key: "bowl", label_en: "Free signature bowl", label_vi: "Miễn phí bowl signature", desc_en: "Any bowl from the menu", desc_vi: "Bất kỳ bowl nào trong menu" },
  { key: "protein", label_en: "Free extra protein", label_vi: "Miễn phí protein", desc_en: "Chicken, tofu, or egg", desc_vi: "Gà, đậu hũ, hoặc trứng" },
  { key: "topping", label_en: "Free premium topping", label_vi: "Miễn phí topping cao cấp", desc_en: "Avocado, salmon, or shrimp", desc_vi: "Bơ, cá hồi, hoặc tôm" },
  { key: "drink", label_en: "Free drink", label_vi: "Miễn phí nước", desc_en: "Any drink at the counter", desc_vi: "Bất kỳ nước nào tại quầy" },
];

export const INGREDIENT_POOL = [
  "carrot", "avocado", "beetroot", "chili", "edamame", "nut", "herb",
] as const;

export type IngredientKey = typeof INGREDIENT_POOL[number] | "mascot";

/**
 * Loyalty economics — single source of truth (TSK-153).
 * Collect {@link STAMPS_REQUIRED} stamps; the next item (the
 * {@link REWARD_ITEM_NUMBER}-th) is free. Bumped 8 → 9 in Sprint 3; every "8"
 * across the UI, the iPOS apply rollover, and the loyalty API now reads these.
 */
export const STAMPS_REQUIRED = 9;
export const REWARD_ITEM_NUMBER = STAMPS_REQUIRED + 1; // 10th item free
