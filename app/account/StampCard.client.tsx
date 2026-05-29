"use client";

import { useState, useCallback } from "react";
import "./stamp-card.css";
import type { StampCard, StampEntry, IngredientKey } from "@/lib/types/loyalty";
import { REWARD_OPTIONS } from "@/lib/types/loyalty";
import IngredientInfographic from "./IngredientInfographic.client";

type Props = {
  card: StampCard | null;
  entries: StampEntry[];
  lang: "en" | "vi";
};

const STRINGS = {
  en: {
    title: "Stamp Card",
    start_collecting: "Start collecting stamps",
    stamps_to_go: (n: number) => `${n} more to go!`,
    reward_ready: "Choose your reward",
    reward_cta: "Choose your reward →",
    reward_helper: "You earned it! Pick your free reward below.",
    redeemed: "Reward redeemed! Starting new card…",
    confirm: "Confirm",
    cancel: "Cancel",
    pick_reward: "Pick your reward",
    loading: "Loading…",
  },
  vi: {
    title: "Thẻ Stamp",
    start_collecting: "Bắt đầu sưu tầm stamp",
    stamps_to_go: (n: number) => `Còn ${n} stamp nữa!`,
    reward_ready: "Chọn phần thưởng",
    reward_cta: "Chọn phần thưởng →",
    reward_helper: "Bạn xứng đáng! Chọn phần thưởng miễn phí bên dưới.",
    redeemed: "Phần thưởng đã đổi! Bắt đầu thẻ mới…",
    confirm: "Xác nhận",
    cancel: "Hủy",
    pick_reward: "Chọn phần thưởng",
    loading: "Đang tải…",
  },
} as const;

/* ── Arc slot positions (in a 260x180 container) ── */
// ∪ bowl shape — 400×260 container, 8 slots on a 160px-radius arc.
// Center of imaginary circle: (200, 40). Sweep from 200° to 340° through bottom of bowl.
/** Slot positions as percentages of a 400×300 reference canvas. The
 *  container uses aspect-ratio 400/300 so these percentages translate
 *  proportionally on any viewport width — keeps the arc centered. */
const ARC_SLOTS: { left: string; top: string }[] = [
  { left: "12.5%", top: "53.33%" },  // slot 1 (left rim)
  { left: "19.25%", top: "36.67%" },  // slot 2
  { left: "30%", top: "25%" },        // slot 3
  { left: "43%", top: "18.67%" },     // slot 4 (apex left)
  { left: "57%", top: "18.67%" },     // slot 5 (apex right)
  { left: "70%", top: "25%" },        // slot 6
  { left: "80.75%", top: "36.67%" },  // slot 7
  { left: "87.5%", top: "53.33%" },   // slot 8 (right rim)
];

/* ── Ingredient SVG icons ── */
function IngredientIcon({ ingredient, size = 28 }: { ingredient: IngredientKey; size?: number }) {
  const s = size;
  switch (ingredient) {
    case "carrot":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <ellipse cx="16" cy="18" rx="5" ry="10" fill="#E8942A" transform="rotate(-20 16 16)" />
          <path d="M14 8 Q16 3 18 8" stroke="#5c8650" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M12 9 Q14 5 16 7" stroke="#476b3e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "avocado":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <ellipse cx="16" cy="17" rx="8" ry="10" fill="#4a7a3a" />
          <circle cx="16" cy="19" r="4" fill="#30462c" />
        </svg>
      );
    case "beetroot":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <ellipse cx="16" cy="19" rx="8" ry="9" fill="#D4A0A8" />
          <path d="M14 10 L13 4" stroke="#5c8650" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 10 L19 5" stroke="#5c8650" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "chili":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <path d="M10 14 Q8 24 16 28 Q20 24 18 14" fill="#D85A30" />
          <path d="M13 14 Q14 10 16 12" stroke="#5c8650" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "edamame":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <ellipse cx="16" cy="16" rx="10" ry="6" fill="#7a5a3a" />
          <circle cx="11" cy="16" r="2.5" fill="#faf7f0" />
          <circle cx="17" cy="16" r="2.5" fill="#faf7f0" />
          <circle cx="23" cy="16" r="2.5" fill="#faf7f0" />
        </svg>
      );
    case "nut":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <ellipse cx="16" cy="16" rx="8" ry="7" fill="#E8942A" />
          <path d="M10 16 Q16 12 22 16" stroke="#c9792a" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case "herb":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <path d="M16 28 L16 14" stroke="#476b3e" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="12" cy="12" rx="5" ry="7" fill="#5c8650" transform="rotate(20 12 12)" />
          <ellipse cx="20" cy="11" rx="5" ry="7" fill="#476b3e" transform="rotate(-15 20 11)" />
        </svg>
      );
    case "mascot":
      return (
        <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden="true">
          <path d="M6 18 Q6 26 16 26 Q26 26 26 18 L6 18Z" fill="none" stroke="#1F5E3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 15 Q11 13 12 15" stroke="#1F5E3A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M20 15 Q21 13 22 15" stroke="#1F5E3A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── Bowl silhouette (sits behind the arc) ── */
/* ── Tossful wordmark — scattered letters in Refusit per IG profile inspo.
     Each letter sits at a hand-tuned (x, y) within the 400×300 viewBox to
     mimic the brand's playful display rhythm. Sits below the stamps. ── */
function TossfulWordmark() {
  // x, y in viewBox coords (viewBox 0 0 400 300). Letters cluster in the
  // middle 40% of the viewBox so the wordmark reads as one composition
  // rather than a sprawl. y oscillates gently — the playful rhythm from
  // the IG profile design without the letters flying apart.
  const letters: Array<{ ch: string; x: number; y: number }> = [
    { ch: "T", x: 142, y: 248 },
    { ch: "O", x: 170, y: 262 },
    { ch: "S", x: 196, y: 272 },
    { ch: "S", x: 222, y: 278 },
    { ch: "F", x: 250, y: 268 },
    { ch: "U", x: 278, y: 256 },
    { ch: "L", x: 308, y: 244 },
  ];
  return (
    <svg
      viewBox="0 0 400 300"
      className="stamp-wordmark"
      aria-label="Tossful"
    >
      {letters.map(({ ch, x, y }, i) => (
        <text key={i} x={x} y={y} fontSize="30">
          {ch}
        </text>
      ))}
    </svg>
  );
}

/* ── Confetti dots for full card ── */
function ConfettiDots() {
  const dots = [
    { cx: 60, cy: 100, r: 3, fill: "#E8942A" },
    { cx: 200, cy: 95, r: 2.5, fill: "#D85A30" },
    { cx: 90, cy: 130, r: 2, fill: "#5c8650" },
    { cx: 170, cy: 125, r: 3, fill: "#D4A0A8" },
    { cx: 45, cy: 140, r: 2, fill: "#4a7a3a" },
    { cx: 215, cy: 135, r: 2.5, fill: "#E8942A" },
    { cx: 110, cy: 150, r: 2, fill: "#7a5a3a" },
    { cx: 150, cy: 145, r: 2.5, fill: "#D85A30" },
  ];
  return (
    <svg
      viewBox="0 0 400 300"
      className="absolute inset-0 w-full h-full pointer-events-none animate-[fadeIn_0.5s_ease-in]"
      aria-hidden="true"
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

/* ── Map stamp_number to ingredient ── */
const SLOT_INGREDIENTS: IngredientKey[] = [
  "carrot", "avocado", "beetroot", "chili", "edamame", "nut", "herb", "mascot",
];

function getSlotIngredient(slotIndex: number, entries: StampEntry[]): IngredientKey | null {
  const entry = entries.find((e) => e.stamp_number === slotIndex + 1);
  if (entry) {
    // For slot 8 (index 7), always use mascot
    if (slotIndex === 7) return "mascot";
    return (entry.ingredient_key as IngredientKey) || SLOT_INGREDIENTS[slotIndex];
  }
  return null;
}

/* ── Main Component ── */
export default function StampCardComponent({ card, entries, lang }: Props) {
  const s = STRINGS[lang];
  const [currentCard, setCurrentCard] = useState<StampCard | null>(card);
  const [currentEntries, setCurrentEntries] = useState<StampEntry[]>(entries);
  const [loading, setLoading] = useState(false);
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [selectedReward, setSelectedReward] = useState<"bowl" | "protein" | "topping" | "drink" | null>(null);
  const [infographicSlot, setInfographicSlot] = useState<{ ingredient: "carrot" | "avocado" | "beetroot" | "chili" | "edamame" | "nut" | "herb"; stampNumber: number } | null>(null);

  const stampsCollected = currentCard?.stamps_collected ?? 0;
  const stampsRemaining = 8 - stampsCollected;
  const latestStamp = stampsCollected;

  const ensureCard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ensure_card" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setCurrentCard(data.card);
      setCurrentEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTestStamp = useCallback(async () => {
    if (!currentCard || currentCard.stamps_collected >= 8) return;
    setLoading(true);
    try {
      const res = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_test_stamp" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setCurrentCard(data.card);
      setCurrentEntries(data.entries ?? []);
      // Auto-open the infographic for the newly earned stamp (only for ingredient stamps, not the mascot/reward slot)
      const newEntries = (data.entries ?? []) as StampEntry[];
      const newest = newEntries[newEntries.length - 1];
      if (newest && newest.ingredient_key !== "mascot") {
        setInfographicSlot({
          ingredient: newest.ingredient_key as "carrot" | "avocado" | "beetroot" | "chili" | "edamame" | "nut" | "herb",
          stampNumber: newest.stamp_number,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [currentCard]);

  const redeemReward = useCallback(async () => {
    if (!selectedReward) return;
    setLoading(true);
    try {
      const res = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem_reward", choice: selectedReward }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setShowRewardPicker(false);
      setSelectedReward(null);
      // Show the new card
      setCurrentCard(data.new_card);
      setCurrentEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedReward]);

  /* ── No card state ── */
  if (!currentCard) {
    return (
      <div className="border border-dashed border-kale-200 rounded-2xl p-8 text-center">
        <div className="mb-4 flex justify-center opacity-30">
          <IngredientIcon ingredient="mascot" size={48} />
        </div>
        <h2 className="font-display italic text-2xl text-kale-700 mb-2">{s.title}</h2>
        <button
          onClick={ensureCard}
          disabled={loading}
          className="mt-4 bg-kale-700 text-white px-6 py-3 rounded-lg hover:bg-kale-800 transition disabled:opacity-50 font-body"
        >
          {loading ? s.loading : s.start_collecting}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-kale-100 rounded-2xl p-6 bg-cream/50">
      {/* Header */}
      <h2 className="font-display italic text-2xl text-kale-700 mb-6 text-center">{s.title}</h2>

      {/* Arc layout */}
      <div className="flex justify-center mb-6">
        <div className="stamp-arc-wrap">
          {/* Tossful wordmark — semicircle below the stamps */}
          <TossfulWordmark />

          {/* Confetti when all 8 */}
          {stampsCollected >= 8 && <ConfettiDots />}

          {/* Stamp slots */}
          {ARC_SLOTS.map((pos, i) => {
            const slotNum = i + 1;
            const filledIngredient = getSlotIngredient(i, currentEntries);
            const isFilled = slotNum <= stampsCollected || filledIngredient !== null;
            const isLatest = slotNum === latestStamp;
            const isEmpty = !isFilled;

            const slotClass = [
              "stamp-slot",
              isEmpty ? "empty" : "filled",
              isLatest ? "latest" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const displayIngredient = filledIngredient ?? SLOT_INGREDIENTS[i];

            const handleSlotClick = () => {
              if (isEmpty && slotNum === stampsCollected + 1) {
                addTestStamp();
              } else if (isFilled && filledIngredient && filledIngredient !== "mascot") {
                setInfographicSlot({
                  ingredient: filledIngredient as "carrot" | "avocado" | "beetroot" | "chili" | "edamame" | "nut" | "herb",
                  stampNumber: slotNum,
                });
              }
            };
            const isClickable = (isEmpty && slotNum === stampsCollected + 1) || (isFilled && filledIngredient && filledIngredient !== "mascot");

            return (
              <div
                key={i}
                className={slotClass}
                style={{
                  left: pos.left,
                  top: pos.top,
                  cursor: isClickable ? "pointer" : undefined,
                }}
                onClick={isClickable ? handleSlotClick : undefined}
                role={isClickable ? "button" : undefined}
                aria-label={isEmpty ? `Click to test stamp ${slotNum}` : isFilled ? `View ${filledIngredient} info` : undefined}
              >
                {isFilled ? (
                  <IngredientIcon ingredient={displayIngredient} size={32} />
                ) : (
                  <span className="text-kale-300 text-xs font-body">{slotNum}</span>
                )}
                {isLatest && <span className="latest-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom section */}
      <div className="text-center">
        {currentCard.reward_status === "collecting" && (
          <div className="space-y-2">
            {/* Progress bar */}
            <div className="mx-auto max-w-[260px] h-2 bg-kale-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-kale-500 rounded-full transition-all duration-500"
                style={{ width: `${(stampsCollected / 8) * 100}%` }}
              />
            </div>
            <p className="text-sm text-kale-600 font-body">
              {stampsRemaining > 0 ? s.stamps_to_go(stampsRemaining) : ""}
            </p>
          </div>
        )}

        {currentCard.reward_status === "reward_ready" && (
          <div className="space-y-3">
            <p className="text-sm text-kale-600 font-body">{s.reward_helper}</p>
            <button
              onClick={() => setShowRewardPicker(true)}
              className="reward-cta font-body"
            >
              {s.reward_cta}
            </button>
          </div>
        )}

        {currentCard.reward_status === "redeemed" && (
          <p className="text-sm text-kale-600 font-body italic">{s.redeemed}</p>
        )}
      </div>

      {/* Ingredient infographic modal */}
      {infographicSlot && (
        <IngredientInfographic
          ingredientKey={infographicSlot.ingredient}
          stampNumber={infographicSlot.stampNumber}
          lang={lang}
          onClose={() => setInfographicSlot(null)}
        />
      )}

      {/* Reward picker overlay */}
      {showRewardPicker && (
        <div className="reward-picker-overlay" onClick={() => setShowRewardPicker(false)}>
          <div
            className="bg-cream rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display italic text-xl text-kale-700 mb-4 text-center">
              {s.pick_reward}
            </h3>
            <div className="space-y-3 mb-6">
              {REWARD_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className={`rp-option ${selectedReward === opt.key ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="reward"
                    value={opt.key}
                    checked={selectedReward === opt.key}
                    onChange={() => setSelectedReward(opt.key)}
                    className="sr-only"
                  />
                  <div>
                    <div className="font-medium text-kale-700 text-sm">
                      {lang === "vi" ? opt.label_vi : opt.label_en}
                    </div>
                    <div className="text-xs text-kale-500">
                      {lang === "vi" ? opt.desc_vi : opt.desc_en}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRewardPicker(false);
                  setSelectedReward(null);
                }}
                className="flex-1 border border-kale-200 text-kale-600 px-4 py-2.5 rounded-lg hover:bg-kale-50 transition font-body text-sm"
              >
                {s.cancel}
              </button>
              <button
                onClick={redeemReward}
                disabled={!selectedReward || loading}
                className="flex-1 bg-kale-700 text-white px-4 py-2.5 rounded-lg hover:bg-kale-800 transition disabled:opacity-50 font-body text-sm"
              >
                {loading ? s.loading : s.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
