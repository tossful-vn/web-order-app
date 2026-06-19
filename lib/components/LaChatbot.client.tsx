"use client";

/**
 * "Lá" — Tossful's FREE, deterministic chatbot (TSK-173 PR2).
 *
 * A floating launcher + panel on the authenticated app. EVERY flow is scripted
 * buttons + canned text + lookups of the customer's OWN data. There is NO LLM and
 * NO external/AI call anywhere — Lá either renders Layer B static content
 * (lib/chatbot/content.ts) or reads Layer A live data (menu, stamp card, saved
 * bowls, the community aggregate). See spec §1/§2.
 *
 * Flows (each a button on the home screen):
 *   onboarding · community favourites · stamp progress · saved-bowl reorder ·
 *   goal filter · verify-phone nudge · FAQ.
 * Guests see onboarding + community + FAQ; personalised flows prompt login.
 *
 * Vietnamese-default. Follows the app-wide EN/VI toggle (lib/lang.ts) once the
 * customer flips it, but defaults to VI even before any preference is stored.
 */

// Vietnamese UI chrome as const up top (AppShell convention); body stays ASCII.
const VI = {
  launcher: "Trò chuyện với Lá",
  title: "Lá",
  subtitle: "Trợ lý của Tossful",
  back: "Quay lại",
  close: "Đóng",
  home_intro: "Lá giúp gì cho bạn?",
  flow_onboarding: "Hướng dẫn nhanh",
  flow_community: "Món được gọi nhiều",
  flow_stamp: "Dấu của tôi",
  flow_saved: "Bowl đã lưu",
  flow_goal: "Tìm theo mục tiêu",
  flow_verify: "Xác minh số điện thoại",
  flow_faq: "Câu hỏi thường gặp",
  loading: "Đang tải…",
  err: "Có lỗi xảy ra, thử lại sau nhé.",
  login_title: "Đăng nhập để dùng tính năng này",
  login_cta: "Đăng nhập",
  community_proof: "được gọi nhiều nhất 30 ngày",
  community_empty: "Chưa đủ dữ liệu để xếp hạng — quay lại sau nhé.",
  community_orders: (n: number) => `${n} lượt gọi`,
  open_menu: "Xem trên menu",
  stamp_progress: (n: number, r: number) =>
    `Bạn có ${n}/9 dấu — còn ${r} nữa là món thứ 10 miễn phí.`,
  stamp_full: "Bạn có 1 phần miễn phí — đọc mã tại cửa hàng.",
  stamp_verify_note: "Xác minh số điện thoại để dấu tự cộng sau mỗi lần ghé.",
  saved_empty: "Bạn chưa lưu bowl nào.",
  saved_build: "Tạo bowl đầu tiên",
  goal_intro: "Bạn đang muốn gì?",
  goal_protein: "Nhiều đạm",
  goal_lowcal: "Ít calo",
  goal_empty: "Chưa có món phù hợp.",
  verify_title: "Xác minh SĐT để tích dấu tự động",
  verify_body:
    "Khi số điện thoại được xác minh, mỗi lần ghé sẽ tự cộng dấu vào thẻ stamp của bạn.",
  verify_cta: "Xác minh ngay",
  verify_done: "Số điện thoại của bạn đã được xác minh. 🎉",
  unit_kcal: "kcal",
  unit_protein_g: "g đạm",
};

const EN: typeof VI = {
  launcher: "Chat with Lá",
  title: "Lá",
  subtitle: "Tossful's assistant",
  back: "Back",
  close: "Close",
  home_intro: "How can Lá help?",
  flow_onboarding: "Quick guide",
  flow_community: "Most ordered",
  flow_stamp: "My stamps",
  flow_saved: "Saved bowls",
  flow_goal: "Find by goal",
  flow_verify: "Verify phone",
  flow_faq: "FAQ",
  loading: "Loading…",
  err: "Something went wrong, try again later.",
  login_title: "Sign in to use this feature",
  login_cta: "Sign in",
  community_proof: "most ordered in the last 30 days",
  community_empty: "Not enough data to rank yet — check back soon.",
  community_orders: (n: number) => `${n} orders`,
  open_menu: "See on the menu",
  stamp_progress: (n: number, r: number) =>
    `You have ${n}/9 stamps — ${r} more to your free 10th item.`,
  stamp_full: "You have a free item — show the code at the store.",
  stamp_verify_note: "Verify your phone so stamps add automatically each visit.",
  saved_empty: "You haven't saved any bowls yet.",
  saved_build: "Build your first bowl",
  goal_intro: "What are you after?",
  goal_protein: "High protein",
  goal_lowcal: "Low calorie",
  goal_empty: "No matching items.",
  verify_title: "Verify your phone for automatic stamps",
  verify_body:
    "Once your phone is verified, every visit adds a stamp to your card automatically.",
  verify_cta: "Verify now",
  verify_done: "Your phone is verified. 🎉",
  unit_kcal: "kcal",
  unit_protein_g: "g protein",
};

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import TossfulMascot from "@/lib/components/TossfulMascot";
import type { Lang } from "@/lib/lang";
import { createClient } from "@/lib/supabase/client";
import { STAMPS_REQUIRED } from "@/lib/types/loyalty";
import { ONBOARDING_CARDS, FAQ_ENTRIES, pick } from "@/lib/chatbot/content";
import { filterByGoal, type Goal, type MenuItem } from "@/lib/chatbot/goalFilter";

// Mirrors lib/lang.ts (kept private there). Lá defaults to VI but follows the
// app-wide toggle once the customer flips it.
const LANG_STORAGE_KEY = "tossful_lang";
const LANG_EVENT = "tossful:lang-changed";

function useWidgetLang(): Lang {
  const [lang, setLang] = useState<Lang>("vi"); // VI default (spec)
  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "vi" || stored === "en") setLang(stored);
    const handler = (e: Event) => {
      const d = (e as CustomEvent<Lang>).detail;
      if (d === "vi" || d === "en") setLang(d);
    };
    window.addEventListener(LANG_EVENT, handler);
    return () => window.removeEventListener(LANG_EVENT, handler);
  }, []);
  return lang;
}

type View =
  | "home"
  | "onboarding"
  | "community"
  | "stamp"
  | "saved"
  | "goal"
  | "verify"
  | "faq";

type Props = {
  /** Logged-in user (email only) or null for guests. */
  user: { email: string | null | undefined } | null;
};

type CommunityItem = {
  item_id: string;
  item_name: string;
  item_type_name: string | null;
  total_qty: number;
  order_count: number;
};

type SavedBowlRow = { id: string; name: string; kcal: number | null };

export default function LaChatbot({ user }: Props) {
  const lang = useWidgetLang();
  const s = lang === "vi" ? VI : EN;
  const isAuthed = !!user;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("home");

  // phone_verified drives whether the verify-phone flow appears on home.
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  useEffect(() => {
    if (!open || !isAuthed) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("phone_verified")
        .maybeSingle();
      if (!cancelled) setPhoneVerified(data?.phone_verified === true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isAuthed]);

  const go = useCallback((v: View) => setView(v), []);
  const closePanel = useCallback(() => {
    setOpen(false);
    setView("home");
  }, []);

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={s.launcher}
          className="fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full bg-cream ring-2 ring-kale-700 shadow-xl flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
        >
          {/* Tossful mascot (TSK-175) — green silhouette on a cream disc with a
              brand-palette ring; the full character is too dark to read on the
              old kale fill. */}
          <TossfulMascot className="w-11 h-11" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label={s.title}
          className="fixed bottom-4 right-4 z-50 flex flex-col w-[calc(100vw-2rem)] max-w-sm h-[34rem] max-h-[80vh] bg-cream rounded-2xl shadow-2xl overflow-hidden border border-kale-100"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-kale-700 text-cream shrink-0">
            {view !== "home" ? (
              <button
                type="button"
                onClick={() => go("home")}
                aria-label={s.back}
                className="w-7 h-7 rounded-full bg-kale-600/60 flex items-center justify-center shrink-0"
              >
                <i className="ti ti-chevron-left text-lg" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-full bg-cream overflow-hidden flex items-center justify-center shrink-0">
                {/* Mascot avatar (TSK-175) — solid cream disc so the green
                    character reads against the kale header. */}
                <TossfulMascot className="w-8 h-8" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-display italic leading-tight">{s.title}</div>
              <div className="text-[11px] text-cream/70 leading-tight truncate">
                {s.subtitle}
              </div>
            </div>
            <button
              type="button"
              onClick={closePanel}
              aria-label={s.close}
              className="w-7 h-7 rounded-full bg-kale-600/60 flex items-center justify-center shrink-0"
            >
              <i className="ti ti-x text-lg" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3 text-ink">
            {view === "home" && (
              <Home
                s={s}
                isAuthed={isAuthed}
                showVerify={isAuthed && phoneVerified === false}
                onPick={go}
              />
            )}
            {view === "onboarding" && <Onboarding lang={lang} onLink={closePanel} />}
            {view === "community" && <Community s={s} onLink={closePanel} />}
            {view === "faq" && <Faq lang={lang} onLink={closePanel} />}

            {/* Gated flows */}
            {view === "stamp" &&
              (isAuthed ? (
                <Stamp s={s} onLink={closePanel} />
              ) : (
                <LoginPrompt s={s} onLink={closePanel} />
              ))}
            {view === "saved" &&
              (isAuthed ? (
                <Saved s={s} onLink={closePanel} />
              ) : (
                <LoginPrompt s={s} onLink={closePanel} />
              ))}
            {view === "goal" &&
              (isAuthed ? (
                <GoalFilter s={s} lang={lang} onLink={closePanel} />
              ) : (
                <LoginPrompt s={s} onLink={closePanel} />
              ))}
            {view === "verify" &&
              (isAuthed ? (
                <Verify s={s} verified={phoneVerified} onLink={closePanel} />
              ) : (
                <LoginPrompt s={s} onLink={closePanel} />
              ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────────────────────── shared bits ───────────────────────────── */

type Str = typeof VI;

function Row({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-kale-100 text-left hover:bg-kale-50 active:bg-kale-100 transition-colors"
    >
      <i className={`ti ${icon} text-xl text-kale-700 w-6 text-center shrink-0`} />
      <span className="flex-1 text-sm text-ink">{label}</span>
      <i className="ti ti-chevron-right text-kale-300" />
    </button>
  );
}

function LinkButton({
  href,
  label,
  onLink,
}: {
  href: string;
  label: string;
  onLink: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={onLink}
      className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-kale-700 hover:underline"
    >
      {label}
      <i className="ti ti-arrow-right text-base" />
    </Link>
  );
}

function Loading({ s }: { s: Str }) {
  return <p className="text-sm text-kale-500 px-1 py-6 text-center">{s.loading}</p>;
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-kale-500 px-1 py-6 text-center">{text}</p>;
}

function LoginPrompt({ s, onLink }: { s: Str; onLink: () => void }) {
  return (
    <div className="px-2 py-6 text-center">
      <i className="ti ti-lock text-3xl text-kale-300" />
      <p className="mt-3 text-sm text-ink">{s.login_title}</p>
      <LinkButton href="/login" label={s.login_cta} onLink={onLink} />
    </div>
  );
}

/* ───────────────────────────── home ───────────────────────────── */

function Home({
  s,
  isAuthed,
  showVerify,
  onPick,
}: {
  s: Str;
  isAuthed: boolean;
  showVerify: boolean;
  onPick: (v: View) => void;
}) {
  // Order matches spec; guest-visible flows always shown, personalised flows are
  // shown too (they prompt login when tapped) EXCEPT verify, which only appears
  // when we know the phone is unverified.
  const rows: Array<{ key: View; icon: string; label: string; show: boolean }> = [
    { key: "onboarding", icon: "ti-sparkles", label: s.flow_onboarding, show: true },
    { key: "community", icon: "ti-flame", label: s.flow_community, show: true },
    { key: "stamp", icon: "ti-stamp", label: s.flow_stamp, show: isAuthed },
    { key: "saved", icon: "ti-bookmark", label: s.flow_saved, show: isAuthed },
    { key: "goal", icon: "ti-target", label: s.flow_goal, show: isAuthed },
    { key: "verify", icon: "ti-phone-check", label: s.flow_verify, show: showVerify },
    { key: "faq", icon: "ti-help-circle", label: s.flow_faq, show: true },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-kale-500 px-1 pb-1">{s.home_intro}</p>
      {rows
        .filter((r) => r.show)
        .map((r) => (
          <Row key={r.key} icon={r.icon} label={r.label} onClick={() => onPick(r.key)} />
        ))}
    </div>
  );
}

/* ───────────────────────────── onboarding ───────────────────────────── */

function Onboarding({ lang, onLink }: { lang: Lang; onLink: () => void }) {
  return (
    <div className="space-y-3">
      {ONBOARDING_CARDS.map((c) => (
        <div key={c.key} className="rounded-xl bg-white border border-kale-100 p-3">
          <div className="flex items-center gap-2">
            <i className={`ti ${c.icon} text-xl text-kale-700`} />
            <h3 className="font-display italic text-kale-700">{pick(c.title, lang)}</h3>
          </div>
          <p className="mt-1.5 text-sm text-ink/80 leading-relaxed">
            {pick(c.body, lang)}
          </p>
          {c.href && c.cta && (
            <LinkButton href={c.href} label={pick(c.cta, lang)} onLink={onLink} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────── community ───────────────────────────── */

function Community({ s, onLink }: { s: Str; onLink: () => void }) {
  const [items, setItems] = useState<CommunityItem[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/recommend/community?limit=5");
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { items: CommunityItem[] };
        if (!cancelled) setItems(json.items ?? []);
      } catch {
        if (!cancelled) setErrored(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (errored) return <Empty text={s.err} />;
  if (items === null) return <Loading s={s} />;
  if (items.length === 0) return <Empty text={s.community_empty} />;

  return (
    <div className="space-y-2">
      <p className="text-xs text-kale-500 px-1 pb-1">{s.community_proof}</p>
      {items.map((it, i) => (
        <div
          key={it.item_id}
          className="rounded-xl bg-white border border-kale-100 p-3 flex items-start gap-3"
        >
          <span className="font-display italic text-kale-400 text-lg leading-none w-5 shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-ink font-medium">{it.item_name}</div>
            <div className="text-[11px] text-kale-500 mt-0.5">
              {s.community_orders(it.order_count)}
            </div>
            <LinkButton href="/nutrition" label={s.open_menu} onLink={onLink} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────── stamp ───────────────────────────── */

function Stamp({ s, onLink }: { s: Str; onLink: () => void }) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error" }
    | { kind: "ok"; collected: number; ready: boolean; verified: boolean }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const [{ data: card }, { data: profile }] = await Promise.all([
          supabase
            .from("stamp_cards")
            .select("stamps_collected, reward_status")
            .in("reward_status", ["collecting", "reward_ready"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("profiles").select("phone_verified").maybeSingle(),
        ]);
        if (cancelled) return;
        const collected = Math.min(Number(card?.stamps_collected ?? 0), STAMPS_REQUIRED);
        setState({
          kind: "ok",
          collected,
          ready: card?.reward_status === "reward_ready",
          verified: profile?.phone_verified === true,
        });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") return <Loading s={s} />;
  if (state.kind === "error") return <Empty text={s.err} />;

  const { collected, ready, verified } = state;
  const remaining = Math.max(STAMPS_REQUIRED - collected, 0);

  return (
    <div className="px-1 py-4 text-center">
      <div className="text-5xl font-display italic text-kale-700">
        {collected}
        <span className="text-kale-300 text-3xl">/{STAMPS_REQUIRED}</span>
      </div>
      <p className="mt-3 text-sm text-ink">
        {ready ? s.stamp_full : s.stamp_progress(collected, remaining)}
      </p>
      {!verified && (
        <p className="mt-3 text-xs text-kale-500">{s.stamp_verify_note}</p>
      )}
      <LinkButton href="/loyalty" label={s.flow_stamp} onLink={onLink} />
    </div>
  );
}

/* ───────────────────────────── saved bowls ───────────────────────────── */

function Saved({ s, onLink }: { s: Str; onLink: () => void }) {
  const [bowls, setBowls] = useState<SavedBowlRow[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("saved_bowls")
          .select("id, name, kcal")
          .order("created_at", { ascending: false })
          .limit(10);
        if (error) throw error;
        if (!cancelled) setBowls((data ?? []) as SavedBowlRow[]);
      } catch {
        if (!cancelled) setErrored(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (errored) return <Empty text={s.err} />;
  if (bowls === null) return <Loading s={s} />;
  if (bowls.length === 0) {
    return (
      <div className="px-2 py-6 text-center">
        <i className="ti ti-bookmark text-3xl text-kale-300" />
        <p className="mt-3 text-sm text-ink">{s.saved_empty}</p>
        <LinkButton href="/nutrition" label={s.saved_build} onLink={onLink} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bowls.map((b) => (
        <Link
          key={b.id}
          href={`/account/bowls/${b.id}`}
          prefetch
          onClick={onLink}
          className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-kale-100 hover:bg-kale-50 active:bg-kale-100 transition-colors"
        >
          <i className="ti ti-salad text-xl text-kale-700 w-6 text-center shrink-0" />
          <span className="flex-1 min-w-0 text-sm text-ink truncate">{b.name}</span>
          {b.kcal != null && (
            <span className="text-[11px] text-kale-500 shrink-0">
              {Math.round(b.kcal)} {s.unit_kcal}
            </span>
          )}
          <i className="ti ti-chevron-right text-kale-300 shrink-0" />
        </Link>
      ))}
    </div>
  );
}

/* ───────────────────────────── goal filter ───────────────────────────── */

function GoalFilter({
  s,
  lang,
  onLink,
}: {
  s: Str;
  lang: Lang;
  onLink: () => void;
}) {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [errored, setErrored] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const [{ data: items, error: ie }, { data: nut, error: ne }] =
          await Promise.all([
            supabase
              .from("items")
              .select("id, name_en, name_vn, category, in_menu")
              .eq("active", true)
              .eq("in_menu", true),
            supabase.from("item_nutrition").select("item_id, calories, protein_g"),
          ]);
        if (ie) throw ie;
        if (ne) throw ne;
        const byId = new Map<string, { calories: number | null; protein_g: number | null }>();
        for (const n of (nut ?? []) as Array<{
          item_id: string;
          calories: number | null;
          protein_g: number | null;
        }>) {
          byId.set(n.item_id, { calories: n.calories, protein_g: n.protein_g });
        }
        const projected: MenuItem[] = ((items ?? []) as Array<{
          id: string;
          name_en: string;
          name_vn: string | null;
          category: string;
        }>).map((i) => ({
          id: i.id,
          name_en: i.name_en,
          name_vn: i.name_vn,
          category: i.category,
          calories: byId.get(i.id)?.calories ?? null,
          protein_g: byId.get(i.id)?.protein_g ?? null,
        }));
        if (!cancelled) setMenu(projected);
      } catch {
        if (!cancelled) setErrored(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = goal && menu ? filterByGoal(menu, goal, 5) : [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-kale-500 px-1">{s.goal_intro}</p>
      {/* chay (vegetarian) deliberately omitted — menu has no veg tags (spec). */}
      <div className="flex gap-2">
        {(
          [
            { g: "protein" as const, label: s.goal_protein, icon: "ti-meat" },
            { g: "lowcal" as const, label: s.goal_lowcal, icon: "ti-flame" },
          ]
        ).map((b) => (
          <button
            key={b.g}
            type="button"
            onClick={() => setGoal(b.g)}
            className={
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-sm font-medium border transition-colors " +
              (goal === b.g
                ? "bg-kale-700 text-cream border-kale-700"
                : "bg-white text-kale-700 border-kale-200 hover:bg-kale-50")
            }
          >
            <i className={`ti ${b.icon} text-base`} />
            {b.label}
          </button>
        ))}
      </div>

      {errored && <Empty text={s.err} />}
      {!errored && goal && menu === null && <Loading s={s} />}
      {!errored && goal && menu !== null && results.length === 0 && (
        <Empty text={s.goal_empty} />
      )}
      {!errored && goal && results.length > 0 && (
        <div className="space-y-2">
          {results.map((it) => (
            <div
              key={it.id}
              className="rounded-xl bg-white border border-kale-100 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-ink font-medium">
                  {lang === "vi" ? it.name_vn ?? it.name_en : it.name_en}
                </span>
                <span className="text-[11px] text-kale-500 shrink-0">
                  {goal === "protein"
                    ? `${it.protein_g} ${s.unit_protein_g}`
                    : `${it.calories} ${s.unit_kcal}`}
                </span>
              </div>
              <LinkButton href="/nutrition" label={s.open_menu} onLink={onLink} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── verify ───────────────────────────── */

function Verify({
  s,
  verified,
  onLink,
}: {
  s: Str;
  verified: boolean | null;
  onLink: () => void;
}) {
  if (verified === true) {
    return (
      <div className="px-2 py-6 text-center">
        <i className="ti ti-circle-check text-3xl text-kale-500" />
        <p className="mt-3 text-sm text-ink">{s.verify_done}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-white border border-kale-100 p-4 text-center">
      <i className="ti ti-phone-check text-3xl text-kale-700" />
      <h3 className="mt-2 font-display italic text-kale-700">{s.verify_title}</h3>
      <p className="mt-1.5 text-sm text-ink/80 leading-relaxed">{s.verify_body}</p>
      <LinkButton href="/account/profile" label={s.verify_cta} onLink={onLink} />
    </div>
  );
}

/* ───────────────────────────── faq ───────────────────────────── */

function Faq({ lang, onLink }: { lang: Lang; onLink: () => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {FAQ_ENTRIES.map((f) => {
        const isOpen = openKey === f.key;
        return (
          <div
            key={f.key}
            className="rounded-xl bg-white border border-kale-100 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : f.key)}
              className="w-full flex items-center gap-2 px-3 py-3 text-left"
              aria-expanded={isOpen}
            >
              <span className="flex-1 text-sm text-ink font-medium">
                {pick(f.q, lang)}
              </span>
              <i
                className={`ti ti-chevron-down text-kale-400 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 -mt-1">
                <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">
                  {pick(f.a, lang)}
                </p>
                {f.href && f.cta && (
                  <LinkButton href={f.href} label={pick(f.cta, lang)} onLink={onLink} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
