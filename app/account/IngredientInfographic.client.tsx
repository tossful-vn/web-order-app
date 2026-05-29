"use client";

import { useState } from "react";
import { INGREDIENT_DATA, type IngredientSurprise } from "@/lib/ingredient-data";

type IngredientKey = "carrot" | "avocado" | "beetroot" | "chili" | "edamame" | "nut" | "herb";

type Props = {
  ingredientKey: IngredientKey;
  stampNumber: number;
  lang: "en" | "vi";
  onClose: () => void;
};

const CATEGORY_LABELS: Record<string, { en: string; vi: string }> = {
  fresh_today: { en: "FRESH TODAY", vi: "TƯƠI HÔM NAY" },
  new_research: { en: "NEW RESEARCH", vi: "NGHIÊN CỨU MỚI" },
  trending: { en: "TRENDING AT TOSSFUL", vi: "ĐANG HOT Ở TOSSFUL" },
  seasonal: { en: "IN SEASON", vi: "ĐÚNG MÙA" },
  did_you_know: { en: "DID YOU KNOW", vi: "BẠN CÓ BIẾT" },
};

const STRINGS = {
  en: {
    about: "ABOUT",
    why_good: "Why it's good for you",
    flavour: "Flavour profile",
    pairs: "Pairs well with",
    grown: "How it's grown",
    fun_fact: "Fun fact",
    source: "Source",
    sources_heading: "Sources",
    sources_body:
      "Nutrition: USDA FoodData Central · Health benefits: peer-reviewed nutrition journals · Growing & seasonality: Vietnam Ministry of Agriculture · Flavour & pairings: Tossful R&D.",
    brand_sign_off: "Curated by Tossful — a bowl for everyone.",
    back: "Nice! Back to my card",
    close: "Close",
  },
  vi: {
    about: "VỀ",
    why_good: "Vì sao tốt cho bạn",
    flavour: "Vị & cảm nhận",
    pairs: "Kết hợp ngon với",
    grown: "Nguồn & cách trồng",
    fun_fact: "Bạn có biết",
    source: "Nguồn",
    sources_heading: "Nguồn dữ liệu",
    sources_body:
      "Dinh dưỡng: USDA FoodData Central · Lợi ích sức khỏe: tạp chí dinh dưỡng đã thẩm định · Mùa vụ & cách trồng: Bộ Nông nghiệp Việt Nam · Vị & kết hợp: Tossful R&D.",
    brand_sign_off: "Tổng hợp bởi Tossful — một bowl cho mọi người.",
    back: "Tuyệt! Quay lại thẻ stamp",
    close: "Đóng",
  },
} as const;

/* ── Inline ingredient icon renderer (matches StampCard) ── */
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
    default:
      return null;
  }
}

/* ── Body renderer: turns **bold** into emphasised spans ── */
function renderBody(body: string) {
  const parts = body.split("**");
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="font-medium not-italic text-white">
        {part}
      </em>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/* ── Small SVG nutrition ring (40px) ── */
function NutritionRing({
  label,
  value,
  color,
  ratio,
}: {
  label: string;
  value: string;
  color: string;
  ratio: number;
}) {
  const size = 52;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(1, ratio)) * circ;
  return (
    <div className="flex flex-col items-center" style={{ width: 64 }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f0eee3"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeDashoffset={circ / 4}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="round"
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[11px] font-body text-ink"
          style={{ lineHeight: 1 }}
        >
          {value}
        </div>
      </div>
      <span className="text-[10px] font-body text-kale-500 mt-1 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

/* ── Section icons ── */
function StarIcon() {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" fill="#1F5E3A" aria-hidden="true">
      <path d="M6 1 L7.5 4.5 L11 5 L8.5 7.5 L9.2 11 L6 9.3 L2.8 11 L3.5 7.5 L1 5 L4.5 4.5 Z" />
    </svg>
  );
}
function CircleIcon() {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
      <circle cx="6" cy="6" r="4" fill="none" stroke="#1F5E3A" strokeWidth="1.2" />
      <circle cx="6" cy="6" r="1.5" fill="#1F5E3A" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" fill="#1F5E3A" aria-hidden="true">
      <rect x="1.5" y="1.5" width="3.5" height="3.5" rx="0.5" />
      <rect x="7" y="1.5" width="3.5" height="3.5" rx="0.5" />
      <rect x="1.5" y="7" width="3.5" height="3.5" rx="0.5" />
      <rect x="7" y="7" width="3.5" height="3.5" rx="0.5" />
    </svg>
  );
}
function LeafIcon() {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
      <path
        d="M2 10 C 3 6 6 3 10 2 C 9 6 6 9 2 10 Z"
        fill="#1F5E3A"
      />
      <path d="M2 10 L 7 5" stroke="#faf7f0" strokeWidth="0.5" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="#c9dac2" strokeWidth="0.9" />
      <path d="M6 3.5 L 6 6 L 8 7" fill="none" stroke="#c9dac2" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
      <path d="M3 3 L 11 11 M 11 3 L 3 11" stroke="#1f2a1d" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Main component ── */
export default function IngredientInfographic({ ingredientKey, stampNumber, lang, onClose }: Props) {
  const data = INGREDIENT_DATA[ingredientKey];
  const s = STRINGS[lang];
  const [surpriseIdx, setSurpriseIdx] = useState(0);

  if (!data) {
    return null;
  }

  const surprises: IngredientSurprise[] = data.surprises;
  const surprise = surprises[surpriseIdx] ?? surprises[0];
  const categoryLabel = CATEGORY_LABELS[surprise.category]?.[lang] ?? surprise.category;
  const surpriseTitle = lang === "vi" ? surprise.title_vn : surprise.title;
  const surpriseBody = lang === "vi" ? surprise.body_vn : surprise.body;
  const surpriseSource = lang === "vi" ? surprise.source_vn : surprise.source;

  const name = lang === "vi" ? data.name_vn : data.name_en;
  const altName = lang === "vi" ? data.name_en : data.name_vn;
  const tagline = lang === "vi" ? data.tagline_vn : data.tagline_en;
  const benefits = lang === "vi" ? data.benefits_vn : data.benefits_en;
  const flavour = lang === "vi" ? data.flavour_vn : data.flavour_en;
  const growing = lang === "vi" ? data.growing_vn : data.growing_en;
  const funFact = lang === "vi" ? data.fun_fact_vn : data.fun_fact_en;

  return (
    <div
      className="ingredient-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="ingredient-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close X */}
        <button
          type="button"
          className="ingredient-modal-close"
          onClick={onClose}
          aria-label={s.close}
        >
          <CloseIcon />
        </button>

        {/* ── Top zone: surprise (dark green) ── */}
        <div className="surprise-zone">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-block font-body uppercase"
              style={{
                fontSize: "11px",
                letterSpacing: "0.12em",
                color: "#faf7f0",
                background: "rgba(250, 247, 240, 0.14)",
                padding: "3px 8px",
                borderRadius: "999px",
              }}
            >
              {categoryLabel}
            </span>
            <span className="font-body" style={{ fontSize: "11px", color: "#a4c098", letterSpacing: "0.04em" }}>
              #{stampNumber}
            </span>
          </div>

          <h3
            className="font-display italic"
            style={{ fontSize: "20px", color: "#faf7f0", lineHeight: 1.25, marginBottom: "10px" }}
          >
            {surpriseTitle}
          </h3>

          <p
            className="font-body"
            style={{ fontSize: "13px", color: "#c9dac2", lineHeight: 1.6 }}
          >
            {renderBody(surpriseBody)}
          </p>

          {/* Divider */}
          <div
            style={{
              height: "0.5px",
              background: "rgba(250, 247, 240, 0.18)",
              margin: "10px 0 8px",
            }}
          />

          {/* Source line */}
          <div className="flex items-center gap-1.5">
            <ClockIcon />
            <span
              className="font-body"
              style={{ fontSize: "11px", color: "#a4c098", letterSpacing: "0.02em" }}
            >
              {s.source}: {surpriseSource}
            </span>
          </div>

          {/* Swipe dots */}
          {surprises.length > 1 && (
            <div className="surprise-dots">
              {surprises.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`surprise-dot ${i === surpriseIdx ? "active" : ""}`}
                  onClick={() => setSurpriseIdx(i)}
                  aria-label={`View surprise ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Zone divider ── */}
        <div className="zone-divider">
          <div className="line" />
          <span className="label">
            {s.about} {data.name_en.toUpperCase()}
          </span>
          <div className="line" />
        </div>

        {/* ── Bottom zone: reference (cream) ── */}
        <div>
          {/* Hero */}
          <div className="flex flex-col items-center pt-3 pb-4 px-4">
            <div
              className="rounded-full flex items-center justify-center mb-3"
              style={{
                width: 72,
                height: 72,
                background: "#f3f7f1",
              }}
            >
              <IngredientIcon ingredient={ingredientKey} size={48} />
            </div>
            <h2
              className="font-display italic text-kale-700"
              style={{ fontSize: "22px", lineHeight: 1.2, marginBottom: 4 }}
            >
              {name}
            </h2>
            <p
              className="font-body text-kale-500"
              style={{ fontSize: "13px", marginBottom: 6 }}
            >
              {altName}
            </p>
            <p
              className="font-body text-kale-600 text-center"
              style={{ fontSize: "13px", fontStyle: "italic" }}
            >
              {tagline}
            </p>
          </div>

          {/* Nutrition rings */}
          <div className="nutri-rings-row">
            {data.nutrition.map((n, i) => (
              <NutritionRing key={i} {...n} />
            ))}
          </div>

          {/* Why it's good */}
          <div className="info-section">
            <div className="flex items-start gap-2 mb-1">
              <span className="info-icon-box">
                <StarIcon />
              </span>
              <h4
                className="font-display italic text-kale-700"
                style={{ fontSize: "14px", lineHeight: 1.3 }}
              >
                {s.why_good}
              </h4>
            </div>
            <p
              className="font-body text-ink"
              style={{ fontSize: "13px", lineHeight: 1.6, paddingLeft: "28px" }}
            >
              {benefits}
            </p>
          </div>

          {/* Flavour */}
          <div className="info-section">
            <div className="flex items-start gap-2 mb-1">
              <span className="info-icon-box">
                <CircleIcon />
              </span>
              <h4
                className="font-display italic text-kale-700"
                style={{ fontSize: "14px", lineHeight: 1.3 }}
              >
                {s.flavour}
              </h4>
            </div>
            <p
              className="font-body text-ink"
              style={{ fontSize: "13px", lineHeight: 1.6, paddingLeft: "28px" }}
            >
              {flavour}
            </p>
          </div>

          {/* Pairings */}
          <div className="info-section">
            <div className="flex items-start gap-2 mb-2">
              <span className="info-icon-box">
                <GridIcon />
              </span>
              <h4
                className="font-display italic text-kale-700"
                style={{ fontSize: "14px", lineHeight: 1.3 }}
              >
                {s.pairs}
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5" style={{ paddingLeft: "26px" }}>
              {data.pairings.map((p, i) => (
                <span key={i} className="pair-chip">
                  <span className="pair-chip-dot" style={{ background: p.color }} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Growing */}
          <div className="info-section">
            <div className="flex items-start gap-2 mb-1">
              <span className="info-icon-box">
                <LeafIcon />
              </span>
              <h4
                className="font-display italic text-kale-700"
                style={{ fontSize: "14px", lineHeight: 1.3 }}
              >
                {s.grown}
              </h4>
            </div>
            <p
              className="font-body text-ink"
              style={{ fontSize: "13px", lineHeight: 1.6, paddingLeft: "28px" }}
            >
              {growing}
            </p>
          </div>

          {/* Fun fact callout */}
          {funFact && (
            <div className="fun-fact-box">
              <span className="fun-fact-badge">!</span>
              <p
                className="font-body text-kale-700"
                style={{ fontSize: "13px", lineHeight: 1.55, fontStyle: "italic" }}
              >
                {funFact}
              </p>
            </div>
          )}

          {/* Sources — always-on attribution */}
          <div className="info-section">
            <div className="flex items-start gap-2 mb-1">
              <span className="info-icon-box">
                <ClockIcon />
              </span>
              <h4
                className="font-display italic text-kale-700"
                style={{ fontSize: "14px", lineHeight: 1.3 }}
              >
                {s.sources_heading}
              </h4>
            </div>
            <p
              className="font-body text-kale-600"
              style={{ fontSize: "11px", lineHeight: 1.55, paddingLeft: "28px" }}
            >
              {s.sources_body}
            </p>
          </div>

          {/* Tossful mascot sign-off */}
          <div className="flex flex-col items-center gap-2 px-4 pt-4 pb-2">
            <img
              src="/brand/tossful-mascot.png"
              alt=""
              aria-hidden="true"
              className="w-[88px] h-auto select-none"
            />
            <p
              className="font-display italic text-kale-600 text-center"
              style={{ fontSize: "12px", lineHeight: 1.4 }}
            >
              {s.brand_sign_off}
            </p>
          </div>

          {/* Back button */}
          <div className="px-4 pt-3 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-kale-700 text-white py-3 rounded-lg hover:bg-kale-800 transition font-body"
              style={{ fontSize: "14px" }}
            >
              {s.back}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
