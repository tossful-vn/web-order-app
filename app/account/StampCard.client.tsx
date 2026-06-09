"use client";

import { useState } from "react";
import "./stamp-card.css";
import type { StampCard, StampEntry, IngredientKey } from "@/lib/types/loyalty";
import { STAMPS_REQUIRED, REWARD_ITEM_NUMBER, INGREDIENT_POOL } from "@/lib/types/loyalty";
import IngredientInfographic from "./IngredientInfographic.client";

type Props = {
  card: StampCard | null;
  entries: StampEntry[];
  /** Whether this account has a verified phone (stamps can attach). */
  hasVerifiedPhone: boolean;
  lang: "en" | "vi";
};

type TappableIngredient = Exclude<IngredientKey, "mascot">;

const STRINGS = {
  en: {
    title: "Stamp Card",
    progress: (n: number) => `${n}/${STAMPS_REQUIRED} — ${STAMPS_REQUIRED - n} more to go!`,
    rule: `Earn 1 stamp per order. Collect ${STAMPS_REQUIRED}, your ${REWARD_ITEM_NUMBER}th item is free.`,
    reward_label: `${REWARD_ITEM_NUMBER}th item free`,
    empty_h: "Your first stamp is waiting",
    empty_p: "Order in store and you'll earn your first stamp — collect 9 for a free item.",
    full_h: "You've earned a free item!",
    full_p: "Show your phone number or code in store to redeem.",
    no_phone_h: "Collect stamps with every order",
    no_phone_p: "Sign up and use your phone number when ordering to start collecting stamps.",
    free: "FREE",
    view_info: (k: string) => `View ${k} info`,
  },
  vi: {
    title: "Thẻ Stamp",
    progress: (n: number) => `${n}/${STAMPS_REQUIRED} — Còn ${STAMPS_REQUIRED - n} dấu nữa!`,
    rule: "Mỗi đơn nhận 1 dấu. Đủ 9 dấu, món thứ 10 miễn phí.",
    reward_label: "Món thứ 10 miễn phí",
    empty_h: "Dấu đầu tiên đang chờ bạn",
    empty_p: "Đặt món tại cửa hàng để nhận dấu đầu tiên — đủ 9 dấu có món miễn phí.",
    full_h: "Bạn có 1 phần miễn phí!",
    full_p: "Đưa SĐT hoặc đọc mã tại cửa hàng để đổi.",
    no_phone_h: "Tích dấu với mỗi đơn hàng",
    no_phone_p: "Đăng ký + dùng số điện thoại khi đặt món để tích dấu.",
    free: "MIỄN PHÍ",
    view_info: (k: string) => `Xem thông tin ${k}`,
  },
} as const;

/* ── Ingredient SVG icons (hand-drawn, brand palette) ── */
function IngredientIcon({ ingredient, size = 28 }: { ingredient: IngredientKey; size?: number }) {
  const s = size;
  switch (ingredient) {
    case "carrot":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <ellipse cx="16" cy="18" rx="5" ry="10" fill="#F68C02" transform="rotate(-20 16 16)" />
          <path d="M14 8 Q16 3 18 8" stroke="#0F563D" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M12 9 Q14 5 16 7" stroke="#0F563D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "avocado":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <ellipse cx="16" cy="17" rx="8" ry="10" fill="#4a7a3a" />
          <circle cx="16" cy="19" r="4" fill="#7D291A" />
        </svg>
      );
    case "beetroot":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <ellipse cx="16" cy="19" rx="8" ry="9" fill="#C25E86" />
          <path d="M14 10 L13 4" stroke="#0F563D" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 10 L19 5" stroke="#0F563D" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "chili":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <path d="M10 14 Q8 24 16 28 Q20 24 18 14" fill="#7D291A" />
          <path d="M13 14 Q14 10 16 12" stroke="#0F563D" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "edamame":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <ellipse cx="16" cy="16" rx="10" ry="6" fill="#5c8650" />
          <circle cx="11" cy="16" r="2.5" fill="#F4F1E6" />
          <circle cx="17" cy="16" r="2.5" fill="#F4F1E6" />
          <circle cx="23" cy="16" r="2.5" fill="#F4F1E6" />
        </svg>
      );
    case "nut":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <ellipse cx="16" cy="16" rx="8" ry="7" fill="#F68C02" />
          <path d="M10 16 Q16 12 22 16" stroke="#7D291A" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case "herb":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <path d="M16 28 L16 14" stroke="#0F563D" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="12" cy="12" rx="5" ry="7" fill="#5c8650" transform="rotate(20 12 12)" />
          <ellipse cx="20" cy="11" rx="5" ry="7" fill="#0F563D" transform="rotate(-15 20 11)" />
        </svg>
      );
    case "mascot":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <path d="M6 18 Q6 26 16 26 Q26 26 26 18 L6 18Z" fill="none" stroke="#0F563D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 15 Q11 13 12 15" stroke="#0F563D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M20 15 Q21 13 22 15" stroke="#0F563D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

/** Gift mark for the free 10th item — the distinct centre when the card fills. */
function GiftMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect x="6" y="14" width="20" height="12" rx="2" fill="#0F563D" />
      <rect x="6" y="11" width="20" height="5" rx="1.5" fill="#0F563D" />
      <rect x="14.5" y="11" width="3" height="15" fill="#F8E3F3" />
      <path d="M16 11 Q12 5 9 8 Q7 11 16 11" fill="#F68C02" />
      <path d="M16 11 Q20 5 23 8 Q25 11 16 11" fill="#F68C02" />
    </svg>
  );
}

/**
 * Even full circle: {@link STAMPS_REQUIRED} slots, 360/N degrees apart, starting
 * at the top and going clockwise. Returned as percentages of the square wrap so
 * the ring stays symmetric at any width (375px and up). Each slot carries a tiny
 * deterministic rotation for the hand-made character.
 */
const RADIUS = 38; // % of the wrap, from centre
const SLOTS = Array.from({ length: STAMPS_REQUIRED }, (_, i) => {
  const angle = (-90 + i * (360 / STAMPS_REQUIRED)) * (Math.PI / 180);
  return {
    left: 50 + RADIUS * Math.cos(angle),
    top: 50 + RADIUS * Math.sin(angle),
    rotate: ((i * 37) % 17) - 8, // -8°..+8°, repeatable
  };
});

/** Slot ingredient: the stored entry's key, else the deterministic pool cycle. */
function slotIngredient(slot: number, entries: StampEntry[]): IngredientKey {
  const entry = entries.find((e) => e.stamp_number === slot);
  const key = (entry?.ingredient_key as IngredientKey) || undefined;
  if (key && key !== "mascot") return key;
  return INGREDIENT_POOL[(slot - 1) % INGREDIENT_POOL.length];
}

export default function StampCardComponent({ card, entries, hasVerifiedPhone, lang }: Props) {
  const s = STRINGS[lang];
  const [infographic, setInfographic] = useState<{ ingredient: TappableIngredient; stampNumber: number } | null>(null);

  const stampsCollected = Math.min(card?.stamps_collected ?? 0, STAMPS_REQUIRED);
  const isFull = stampsCollected >= STAMPS_REQUIRED || card?.reward_status === "reward_ready";

  /* ── State 1: no verified phone — stamps can't attach yet ── */
  if (!hasVerifiedPhone) {
    return (
      <div className="stamp-card stamp-card-message">
        <div className="stamp-message-mascot" aria-hidden="true">
          <IngredientIcon ingredient="mascot" size={44} />
        </div>
        <h2 className="font-display italic text-2xl text-[#0F563D] mb-2">{s.no_phone_h}</h2>
        <p className="font-body text-sm text-[#3a5634] max-w-xs mx-auto">{s.no_phone_p}</p>
      </div>
    );
  }

  return (
    <div className="stamp-card">
      <h2 className="font-display italic text-2xl text-[#0F563D] mb-1 text-center">{s.title}</h2>
      <p className="font-body text-xs text-[#3a5634]/80 text-center mb-5">{s.rule}</p>

      {/* Even full-circle ring with the mascot / free-item at the centre */}
      <div className="flex justify-center mb-5">
        <div className={`stamp-ring${isFull ? " is-full" : ""}`}>
          {/* Centre node — mascot while collecting, the distinct free 10th when full */}
          <div className={`stamp-centre${isFull ? " reward" : ""}`} aria-hidden="true">
            {isFull ? (
              <>
                <GiftMark size={30} />
                <span className="stamp-centre-free font-body">{s.free}</span>
              </>
            ) : (
              <IngredientIcon ingredient="mascot" size={34} />
            )}
          </div>

          {SLOTS.map((pos, i) => {
            const slotNum = i + 1;
            const filled = slotNum <= stampsCollected;
            const ingredient = slotIngredient(slotNum, entries);
            const tappable = filled && ingredient !== "mascot";

            return (
              <div
                key={i}
                className={`stamp-slot ${filled ? "filled" : "empty"}`}
                style={{
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  ["--rot" as string]: `${pos.rotate}deg`,
                  cursor: tappable ? "pointer" : undefined,
                }}
                onClick={
                  tappable
                    ? () => setInfographic({ ingredient: ingredient as TappableIngredient, stampNumber: slotNum })
                    : undefined
                }
                role={tappable ? "button" : undefined}
                aria-label={filled ? s.view_info(ingredient) : `${slotNum}`}
              >
                {filled ? (
                  <IngredientIcon ingredient={ingredient} size={30} />
                ) : (
                  <span className="font-body text-xs text-[#a4c098]">{slotNum}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status line */}
      <div className="text-center space-y-2">
        {isFull ? (
          <div className="stamp-reward-banner">
            <p className="font-display italic text-lg text-[#0F563D]">{s.full_h}</p>
            <p className="font-body text-sm text-[#3a5634]">{s.full_p}</p>
          </div>
        ) : stampsCollected === 0 ? (
          <div className="space-y-1">
            <p className="font-display italic text-lg text-[#0F563D]">{s.empty_h}</p>
            <p className="font-body text-sm text-[#3a5634]">{s.empty_p}</p>
          </div>
        ) : (
          <p className="font-body text-sm text-[#0F563D] font-medium">{s.progress(stampsCollected)}</p>
        )}
      </div>

      {/* Ingredient infographic (read-only tap on a collected stamp) */}
      {infographic && (
        <IngredientInfographic
          ingredientKey={infographic.ingredient}
          stampNumber={infographic.stampNumber}
          lang={lang}
          onClose={() => setInfographic(null)}
        />
      )}
    </div>
  );
}
