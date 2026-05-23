"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_BG,
  CATEGORY_ORDER,
  DAILY,
  PHOTO_MAP,
  SIG_PHOTO_MAP,
  ingredientIcon,
  type Category,
  type MacroKey,
} from "./photo-maps";
import { I18N, t, type Lang } from "./i18n";

// ===== Types =====
type Nutrition = {
  item_id: string;
  calories: number | null;
  protein_g: number | null;
  total_fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
};

type Item = {
  id: string;
  name_en: string;
  name_vn: string | null;
  category: string;
  kind: string | null;
  tossful_portion_g: number | null;
  notes?: string | null;
  nutrition?: Nutrition | null;
};

type RecipeComponent = {
  recipe_id: string;
  component_id: string;
  quantity_g: number;
  sort_order: number;
};

type SigBowl = {
  id: string;
  name: string;
  tagline: string | null;
  total_g: number | null;
  components: RecipeComponent[];
  macros: {
    calories: number;
    protein_g: number;
    total_fat_g: number;
    carbs_g: number;
    fiber_g: number;
  };
};

type Tab = "signature" | "byo" | "feedback";

const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R; // ~188.5
const SINGLE_SELECT = new Set<string>(); // all categories multi-select

// ===== Helpers =====
function macrosFor(item: Item) {
  const n = item.nutrition ?? ({} as Partial<Nutrition>);
  const portion = item.tossful_portion_g ?? 0;
  const factor = portion / 100;
  return {
    calories: (n.calories ?? 0) * factor,
    protein_g: (n.protein_g ?? 0) * factor,
    total_fat_g: (n.total_fat_g ?? 0) * factor,
    carbs_g: (n.carbs_g ?? 0) * factor,
    fiber_g: (n.fiber_g ?? 0) * factor,
  };
}

function computeBowlMacros(components: RecipeComponent[], items: Item[]) {
  const totals = { calories: 0, protein_g: 0, total_fat_g: 0, carbs_g: 0, fiber_g: 0 };
  for (const comp of components) {
    const item = items.find((i) => i.id === comp.component_id);
    if (!item || !item.nutrition) continue;
    const n = item.nutrition;
    const factor = comp.quantity_g / 100;
    totals.calories += (n.calories ?? 0) * factor;
    totals.protein_g += (n.protein_g ?? 0) * factor;
    totals.total_fat_g += (n.total_fat_g ?? 0) * factor;
    totals.carbs_g += (n.carbs_g ?? 0) * factor;
    totals.fiber_g += (n.fiber_g ?? 0) * factor;
  }
  return totals;
}

function feedbackSource(): string {
  if (typeof window === "undefined") return "direct";
  const allowed = ["in-store", "zalo", "facebook", "website", "direct"];
  try {
    const src = new URLSearchParams(window.location.search).get("src");
    if (src && allowed.includes(src)) return src;
  } catch {}
  return "direct";
}

function pickName(item: Item, lang: Lang) {
  return lang === "vi" && item.name_vn ? item.name_vn : item.name_en;
}

// ===== Component =====
export default function Calculator() {
  const supabase = useMemo(() => createClient(), []);

  const [lang, setLangState] = useState<Lang>("en");
  const [tab, setTab] = useState<Tab>("byo");
  const [items, setItems] = useState<Item[]>([]);
  const [signatureBowls, setSignatureBowls] = useState<SigBowl[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [lastAppliedSignature, setLastAppliedSignature] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore lang + customer name from localStorage AFTER first render
  // (avoids hydration mismatch — server can't know localStorage)
  useEffect(() => {
    const savedLang = localStorage.getItem("tossful_lang");
    if (savedLang === "vi" || savedLang === "en") setLangState(savedLang);
    setCustomerName((localStorage.getItem("tossful_customer_name") ?? "").trim());
    setHydrated(true);
  }, []);

  // Persist lang to localStorage + <html lang=""> attr
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("tossful_lang", lang);
    document.documentElement.lang = lang;
  }, [lang, hydrated]);

  // Persist customer name to localStorage
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("tossful_customer_name", customerName.trim());
  }, [customerName, hydrated]);

  // Load items + signature bowls from Supabase
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: rawItems, error: itemErr } = await supabase
          .from("items")
          .select("id,name_en,name_vn,category,kind,tossful_portion_g,notes")
          .eq("in_menu", true)
          .eq("active", true)
          .in("category", ["Base", "Topping", "Premium", "Dressing", "Signature"])
          .order("category", { ascending: true })
          .order("name_en", { ascending: true });
        if (itemErr) throw new Error(itemErr.message);

        const { data: nutrition, error: nutErr } = await supabase
          .from("item_nutrition")
          .select("*");
        if (nutErr) throw new Error(nutErr.message);

        const byItemId: Record<string, Nutrition> = {};
        for (const n of (nutrition ?? []) as Nutrition[]) byItemId[n.item_id] = n;

        const enriched: Item[] = ((rawItems ?? []) as Item[]).map((i) => ({
          ...i,
          nutrition: byItemId[i.id] ?? null,
        }));

        // Signature recipes
        const sigItems = enriched.filter((i) => i.category === "Signature");
        let sigBowls: SigBowl[] = [];
        if (sigItems.length) {
          const sigIds = sigItems.map((s) => s.id);
          const { data: comps, error: compErr } = await supabase
            .from("recipe_components")
            .select("recipe_id,component_id,quantity_g,sort_order")
            .in("recipe_id", sigIds);
          if (compErr) throw new Error(compErr.message);

          const byBowl: Record<string, RecipeComponent[]> = {};
          for (const c of (comps ?? []) as RecipeComponent[]) {
            (byBowl[c.recipe_id] = byBowl[c.recipe_id] ?? []).push(c);
          }

          sigBowls = sigItems.map((s) => {
            const tagSrc = s.notes?.split("|")[0]?.trim() ?? "";
            const tagline = tagSrc.length > 0 && tagSrc.length < 60 ? tagSrc : null;
            const components = (byBowl[s.id] ?? []).sort((a, b) => a.sort_order - b.sort_order);
            return {
              id: s.id,
              name: s.name_en,
              tagline,
              total_g: s.tossful_portion_g,
              components,
              macros: computeBowlMacros(components, enriched),
            };
          });
        }

        // Strip Signature items from the BYO list
        const byoItems = enriched.filter((i) => i.category !== "Signature");

        if (cancelled) return;
        setItems(byoItems);
        setSignatureBowls(sigBowls);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // ===== Derived state =====
  const totals = useMemo(() => {
    const out = { cal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
    for (const [id, qty] of Object.entries(selected)) {
      const item = items.find((i) => i.id === id);
      if (!item) continue;
      const m = macrosFor(item);
      out.cal += m.calories * qty;
      out.protein += m.protein_g * qty;
      out.fat += m.total_fat_g * qty;
      out.carbs += m.carbs_g * qty;
      out.fiber += m.fiber_g * qty;
    }
    return out;
  }, [selected, items]);

  const countsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [id, qty] of Object.entries(selected)) {
      const item = items.find((i) => i.id === id);
      if (!item) continue;
      counts[item.category] = (counts[item.category] ?? 0) + qty;
    }
    return counts;
  }, [selected, items]);

  const summaryRows = useMemo(() => {
    const rows: { item: Item; qty: number; portion: number }[] = [];
    let totalG = 0;
    for (const cat of CATEGORY_ORDER) {
      for (const [id, qty] of Object.entries(selected)) {
        const item = items.find((i) => i.id === id);
        if (!item || item.category !== cat) continue;
        const portion = (item.tossful_portion_g ?? 0) * qty;
        totalG += portion;
        rows.push({ item, qty, portion });
      }
    }
    return { rows, totalG };
  }, [selected, items]);

  // ===== Handlers =====
  const toggleChip = useCallback(
    (item: Item) => {
      setSelected((prev) => {
        const next = { ...prev };
        if (SINGLE_SELECT.has(item.category)) {
          for (const otherId of Object.keys(next)) {
            const other = items.find((i) => i.id === otherId);
            if (other && other.category === item.category && other.id !== item.id) {
              delete next[otherId];
            }
          }
        }
        if (item.id in next) delete next[item.id];
        else next[item.id] = 1;
        return next;
      });
    },
    [items]
  );

  const incrementQty = useCallback((item: Item) => {
    setSelected((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
  }, []);

  const decrementQty = useCallback((item: Item) => {
    setSelected((prev) => {
      const cur = prev[item.id] ?? 0;
      const next = { ...prev };
      if (cur <= 1) delete next[item.id];
      else next[item.id] = cur - 1;
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSelected({});
    setLastAppliedSignature(null);
  }, []);

  const useBowl = useCallback(
    (bowlId: string) => {
      const bowl = signatureBowls.find((b) => b.id === bowlId);
      if (!bowl) return;
      setLastAppliedSignature(bowl.name);
      const next: Record<string, number> = {};
      for (const comp of bowl.components) {
        const item = items.find((i) => i.id === comp.component_id);
        if (!item) continue;
        if (!(CATEGORY_ORDER as readonly string[]).includes(item.category)) continue;
        next[item.id] = next[item.id] ?? 1;
      }
      setSelected(next);
      setTab("byo");
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [items, signatureBowls]
  );

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
  }, []);

  // ===== Render =====
  const str = I18N[lang];
  const items_by_cat = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const i of items) (map[i.category] = map[i.category] ?? []).push(i);
    return map;
  }, [items]);

  return (
    <div className="tossful-calc">
      <div className="app">
        {/* Header */}
        <div className="hdr">
          <img alt="Tossful" src="/nutrition/tossful-logo.png" />
          <div className="info">
            <div className="t">{str.page_title}</div>
            <div className="s">{str.page_subtitle}</div>
          </div>
          <div className="lang-toggle">
            <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
              EN
            </button>
            <button className={lang === "vi" ? "on" : ""} onClick={() => setLang("vi")}>
              VI
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <span className={tab === "signature" ? "on" : ""} onClick={() => setTab("signature")}>
            {str.tab_signature}
          </span>
          <span className={tab === "byo" ? "on" : ""} onClick={() => setTab("byo")}>
            {str.tab_byo}
          </span>
          <span className={tab === "feedback" ? "on" : ""} onClick={() => setTab("feedback")}>
            {str.tab_feedback}
          </span>
        </div>

        {/* Bowl-building chrome — hidden on feedback tab */}
        {tab !== "feedback" && (
          <>
            <div className="hero">
              <h1>{str.hero_title}</h1>
              <p>{str.hero_subtitle}</p>
            </div>

            <div
              className="infographic"
              style={{ ["--bowl-label" as never]: `"${str.bowl_label}"` }}
            >
              <div className="igrid">
                {(Object.keys(DAILY) as MacroKey[]).map((key) => {
                  const cfg = DAILY[key];
                  const value = (totals as Record<string, number>)[key] ?? 0;
                  const pct = cfg.daily > 0 ? Math.round((value / cfg.daily) * 100) : 0;
                  const filled = (Math.min(pct, 100) / 100) * RING_C;
                  const display = key === "cal" ? Math.round(value) : value.toFixed(1);
                  return (
                    <div key={key} className="ring-item" data-macro={key}>
                      <div className="ring-wrap">
                        <svg className="ring" viewBox="0 0 72 72">
                          <circle className="bg" cx={36} cy={36} r={RING_R} />
                          <circle
                            className="fg"
                            cx={36}
                            cy={36}
                            r={RING_R}
                            style={{ strokeDasharray: `${filled} ${RING_C}` }}
                          />
                        </svg>
                        <div className="ring-center">
                          <div className="val">
                            {display}
                            {cfg.suffix}
                          </div>
                          <div className="lbl">
                            {(str as unknown as Record<string, string>)[`macro_${key}`]}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Signature tab */}
        {tab === "signature" && (
          <div className="sigs">
            {signatureBowls.length === 0 && !loading ? (
              <div
                className="empty"
                style={{
                  gridColumn: "1/-1",
                  textAlign: "center",
                  color: "#888",
                  padding: 20,
                  fontSize: 12,
                }}
              >
                No signature bowls yet.
              </div>
            ) : (
              signatureBowls.map((b) => {
                const ingsList = b.components
                  .map((c) => items.find((i) => i.id === c.component_id))
                  .filter((it): it is Item => !!it)
                  .map((it) => pickName(it, lang))
                  .join(" · ");
                const photo = SIG_PHOTO_MAP[b.name];
                return (
                  <div key={b.id} className="sig-card">
                    <div className="photo">
                      {photo ? (
                        <img src={`/nutrition/${photo}`} alt={b.name} loading="lazy" />
                      ) : (
                        <div className="ph">{b.name}</div>
                      )}
                    </div>
                    <div className="body">
                      <h4>{b.name}</h4>
                      {b.tagline && <div className="tag">{b.tagline}</div>}
                      <div className="macros">
                        <div className="m">
                          <div className="v">{Math.round(b.macros.calories)}</div>
                          <div className="l">{str.macro_cal}</div>
                        </div>
                        <div className="m">
                          <div className="v">{b.macros.protein_g.toFixed(0)}g</div>
                          <div className="l">{str.macro_protein}</div>
                        </div>
                        <div className="m">
                          <div className="v">{b.macros.total_fat_g.toFixed(0)}g</div>
                          <div className="l">{str.macro_fat}</div>
                        </div>
                        <div className="m">
                          <div className="v">{b.macros.carbs_g.toFixed(0)}g</div>
                          <div className="l">{str.macro_carbs}</div>
                        </div>
                      </div>
                      <div className="ings">{ingsList}</div>
                      <button className="use-btn" onClick={() => useBowl(b.id)}>
                        {str.start_from_bowl} <i className="ti ti-arrow-right" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* BYO tab */}
        {tab === "byo" && (
          <div id="content">
            {loading && <div className="loader">Loading ingredients...</div>}
            {error && <div className="err">{error}</div>}
            {!loading && !error &&
              CATEGORY_ORDER.map((cat) => {
                const list = items_by_cat[cat] ?? [];
                if (list.length === 0) return null;
                const n = countsByCategory[cat] ?? 0;
                const catLabelKey = `cat_${cat}` as keyof typeof str;
                return (
                  <div className="section" key={cat} data-category={cat}>
                    <div className="h">
                      <h3>{String((str as unknown as Record<string, string>)[catLabelKey])}</h3>
                      <div className="meta">
                        <span className={`count${n === 0 ? " zero" : ""}`}>{n}</span>
                        <span className="hint">{str.pick_any}</span>
                      </div>
                    </div>
                    <div className="chips">
                      {list.map((item) => {
                        const isOn = item.id in selected;
                        const isKale = SINGLE_SELECT.has(item.category);
                        const bg = CATEGORY_BG[item.category as Category] ?? "#888";
                        const photo = PHOTO_MAP[item.name_en];
                        const icon = photo ? null : ingredientIcon(item.name_en);
                        const cls = isOn ? (isKale ? "chip on-kale" : "chip on") : "chip";
                        return (
                          <div
                            key={item.id}
                            className={cls}
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest(".chip-qty")) return;
                              toggleChip(item);
                            }}
                          >
                            <div className="chip-img" style={photo ? undefined : { background: bg }}>
                              {photo ? (
                                <img src={`/nutrition/${photo}`} alt={item.name_en} loading="lazy" />
                              ) : icon ? (
                                <i className={`ti ${icon}`} aria-hidden="true" />
                              ) : (
                                <span className="initial">{item.name_en.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="chip-name">{pickName(item, lang)}</div>
                            <div className="chip-qty">
                              <button
                                className="qty-minus"
                                aria-label="Decrease"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  decrementQty(item);
                                }}
                              >
                                -
                              </button>
                              <span className="qty-num">{selected[item.id] ?? 1}</span>
                              <button
                                className="qty-plus"
                                aria-label="Increase"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  incrementQty(item);
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {/* Bowl summary */}
            {!loading && !error && (
              <div className="summary">
                <h3>
                  {str.your_bowl}
                  <span className="total-g">{Math.round(summaryRows.totalG)} g</span>
                </h3>
                <div className="summary-list">
                  {summaryRows.rows.length === 0 ? (
                    <div className="empty">{str.empty_summary}</div>
                  ) : (
                    summaryRows.rows.map(({ item, qty, portion }) => {
                      const photo = PHOTO_MAP[item.name_en];
                      return (
                        <div key={item.id} className="summary-item">
                          <div className="thumb">
                            {photo ? (
                              <img src={`/nutrition/${photo}`} alt="" />
                            ) : (
                              <i className="ti ti-bowl" aria-hidden="true" />
                            )}
                          </div>
                          <span className="name">
                            {pickName(item, lang)}{" "}
                            {qty > 1 && <span className="qty-badge">x{qty}</span>}
                          </span>
                          <span className="gram">{Math.round(portion)}g</span>
                          <button
                            className="remove"
                            aria-label={`Remove ${pickName(item, lang)}`}
                            onClick={() => removeItem(item.id)}
                          >
                            <i className="ti ti-x" aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback tab */}
        {tab === "feedback" && (
          <FeedbackForm
            lang={lang}
            str={str}
            customerName={customerName}
            ctx={{
              bowl_mode: lastAppliedSignature ? "signature" : "byo",
              signature_bowl: lastAppliedSignature,
              ingredients: Object.entries(selected)
                .map(([id, qty]) => {
                  const item = items.find((i) => i.id === id);
                  if (!item) return null;
                  const name = pickName(item, lang);
                  return qty > 1 ? `${name} x${qty}` : name;
                })
                .filter(Boolean)
                .join(", "),
              macros: {
                cal: Math.round(totals.cal),
                protein_g: +totals.protein.toFixed(1),
                fat_g: +totals.fat.toFixed(1),
                carbs_g: +totals.carbs.toFixed(1),
                fiber_g: +totals.fiber.toFixed(1),
              },
              lang,
              source: feedbackSource(),
            }}
          />
        )}

        {/* Bowl-building chrome footer — hidden on feedback */}
        {tab !== "feedback" && (
          <>
            <div className="name-row">
              <input
                className="name-input"
                type="text"
                maxLength={40}
                autoComplete="given-name"
                placeholder={str.name_placeholder}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="foot">
              <button className="btn ghost" onClick={reset}>
                {str.reset}
              </button>
              <button
                className="btn kale"
                disabled
                title={str.save_soon}
                aria-disabled="true"
              >
                {str.save_bowl}
              </button>
            </div>
            <div className="save-soon">{str.save_soon}</div>
            <div className="foot-note">{str.microcopy}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== Feedback form (inline subcomponent) =====
type FeedbackCtx = {
  bowl_mode: "signature" | "byo";
  signature_bowl: string | null;
  ingredients: string;
  macros: { cal: number; protein_g: number; fat_g: number; carbs_g: number; fiber_g: number };
  lang: Lang;
  source: string;
};

function FeedbackForm({
  lang,
  str,
  customerName,
  ctx,
}: {
  lang: Lang;
  str: (typeof I18N)[Lang];
  customerName: string;
  ctx: FeedbackCtx;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [ease, setEase] = useState<string | null>(null);
  const [order, setOrder] = useState<string | null>(null);
  const [channels, setChannels] = useState<Set<string>>(new Set());
  const [confusion, setConfusion] = useState("");
  const [missing, setMissing] = useState("");
  const [other, setOther] = useState("");
  const [zalo, setZalo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const toggleChannel = (v: string) => {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const reset = () => {
    setEase(null); setOrder(null); setChannels(new Set());
    setConfusion(""); setMissing(""); setOther(""); setZalo("");
    setErr(null); setDone(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!ease || !order) {
      setErr(str.fb_required);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer_name: customerName || null,
        ease_score: parseInt(ease, 10),
        would_order: order,
        confusion: confusion.trim() || null,
        preferred_channels: Array.from(channels),
        missing_features: missing.trim() || null,
        other_comments: other.trim() || null,
        contact_zalo: zalo.trim() || null,
        bowl_mode: ctx.bowl_mode,
        signature_bowl: ctx.signature_bowl,
        ingredients: ctx.ingredients || null,
        macros: ctx.macros,
        lang: ctx.lang,
        source: ctx.source,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : "",
      };
      const { error: insertErr } = await supabase.from("customer_feedback").insert(payload);
      if (insertErr) throw new Error(insertErr.message);
      setDone(true);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      setErr(str.fb_error);
      console.error("feedback submit failed:", e2);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="fb-thanks">
        <i className="ti ti-circle-check" />
        <h3>{str.fb_thanks_title}</h3>
        <p>{str.fb_thanks_body}</p>
        <button type="button" className="fb-thanks-again" onClick={reset}>
          {str.fb_thanks_again}
        </button>
      </div>
    );
  }

  const macrosLine = ctx.macros.cal
    ? `${ctx.macros.cal} cal · ${ctx.macros.protein_g}g ${str.proteinLbl} · ${ctx.macros.fat_g}g ${str.fatLbl} · ${ctx.macros.carbs_g}g ${str.carbsLbl}`
    : "—";
  const modeLabel = ctx.bowl_mode === "signature" ? str.signature_mode : str.byo_mode;

  return (
    <div className="fb-wrap">
      <div className="fb-head">
        <h2>{str.fb_title}</h2>
        <p>{str.fb_intro}</p>
      </div>
      <form onSubmit={submit} noValidate>
        {/* Q1 — ease */}
        <div className="fb-q">
          <label className="fb-label">{str.fb_q_ease}</label>
          <div className="fb-scale">
            {["1", "2", "3", "4", "5"].map((v) => (
              <button
                type="button"
                key={v}
                className={ease === v ? "on" : ""}
                onClick={() => setEase(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="fb-scale-labels">
            <span>{str.fb_ease_low}</span>
            <span>{str.fb_ease_high}</span>
          </div>
        </div>

        {/* Q2 — order */}
        <div className="fb-q">
          <label className="fb-label">{str.fb_q_order}</label>
          <div className="fb-choices">
            <button type="button" className={order === "yes" ? "on" : ""} onClick={() => setOrder("yes")}>
              {str.fb_order_yes}
            </button>
            <button type="button" className={order === "maybe" ? "on" : ""} onClick={() => setOrder("maybe")}>
              {str.fb_order_maybe}
            </button>
            <button type="button" className={order === "no" ? "on" : ""} onClick={() => setOrder("no")}>
              {str.fb_order_no}
            </button>
          </div>
        </div>

        {/* Auto-attached context preview */}
        <div className="fb-context">
          <span className="fb-context-label">{str.fb_context_label}</span>
          <div className="fb-context-rows">
            <div className="fb-context-row"><span className="k">{str.mode_label}</span><span className="v">{modeLabel}</span></div>
            <div className="fb-context-row"><span className="k">{str.bowl_label_ctx}</span><span className="v">{ctx.signature_bowl ?? "—"}</span></div>
            <div className="fb-context-row"><span className="k">{str.ingredients_label}</span><span className="v">{ctx.ingredients || "—"}</span></div>
            <div className="fb-context-row"><span className="k">{str.macros_label}</span><span className="v">{macrosLine}</span></div>
            <div className="fb-context-row"><span className="k">{str.language_label}</span><span className="v">{ctx.lang.toUpperCase()}</span></div>
            <div className="fb-context-row"><span className="k">{str.source_label}</span><span className="v">{ctx.source}</span></div>
          </div>
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_confusion}</label>
          <textarea className="fb-textarea" maxLength={500} value={confusion} onChange={(e) => setConfusion(e.target.value)} />
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_channels}</label>
          <div className="fb-multi">
            {[
              { v: "in-store", l: str.fb_ch_instore },
              { v: "zalo", l: str.fb_ch_zalo },
              { v: "website", l: str.fb_ch_website },
              { v: "facebook", l: str.fb_ch_facebook },
              { v: "other", l: str.fb_ch_other },
            ].map((opt) => (
              <button
                type="button"
                key={opt.v}
                className={channels.has(opt.v) ? "on" : ""}
                onClick={() => toggleChannel(opt.v)}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_missing}</label>
          <textarea className="fb-textarea" maxLength={500} value={missing} onChange={(e) => setMissing(e.target.value)} />
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_other}</label>
          <textarea className="fb-textarea" maxLength={500} value={other} onChange={(e) => setOther(e.target.value)} />
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_zalo}</label>
          <input
            className="fb-input"
            type="text"
            maxLength={50}
            placeholder={str.fb_zalo_placeholder}
            value={zalo}
            onChange={(e) => setZalo(e.target.value)}
          />
        </div>

        <div className="fb-submit-row">
          <button type="submit" className="fb-submit" disabled={submitting}>
            {submitting ? str.fb_submitting : str.fb_submit}
          </button>
        </div>

        {err && <div className="fb-error">{err}</div>}
      </form>
    </div>
  );
}
// trailing buffer
