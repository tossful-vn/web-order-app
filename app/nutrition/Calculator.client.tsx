"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveBowl } from "@/lib/bowls/actions";
import type { BowlComposition } from "@/lib/types/database";
import { useLang, type Lang } from "@/lib/lang";
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
import { I18N } from "./i18n";

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

type View = "choose" | "browse-signature" | "edit";

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

function pickName(item: Item, lang: Lang) {
  return lang === "vi" && item.name_vn ? item.name_vn : item.name_en;
}

function suggestBowlName(
  selected: Record<string, number>,
  items: Item[],
  lang: Lang,
): string {
  const ids = Object.keys(selected);
  if (ids.length === 0) return "";
  const picked = ids
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is Item => !!i);
  const byCat: Record<string, Item[]> = {};
  for (const i of picked) (byCat[i.category] = byCat[i.category] ?? []).push(i);
  const base = (byCat["Base"] ?? [])[0];
  const protein = (byCat["Premium"] ?? [])[0];
  const dressing = (byCat["Dressing"] ?? [])[0];
  const topping = (byCat["Topping"] ?? [])[0];
  const n = (it: Item) => pickName(it, lang);
  if (lang === "vi") {
    if (base && protein) return "Tô " + n(protein) + " + " + n(base);
    if (base && dressing) return "Tô " + n(base) + " sot " + n(dressing);
    if (base && topping) return "Tô " + n(base) + " " + n(topping);
    if (base) return "Tô " + n(base);
    if (protein) return "Tô " + n(protein);
    return "Tô cua ban";
  }
  if (base && protein) return n(base) + " + " + n(protein) + " bowl";
  if (base && dressing) return n(dressing) + " " + n(base).toLowerCase() + " bowl";
  if (base && topping) return n(topping) + " " + n(base).toLowerCase() + " bowl";
  if (base) return n(base) + " bowl";
  if (protein) return n(protein) + " bowl";
  return "Your bowl";
}

// ===== Component =====
export default function Calculator() {
  const supabase = useMemo(() => createClient(), []);

  const [lang] = useLang();
  const [view, setView] = useState<View>("choose");
  const [items, setItems] = useState<Item[]>([]);
  const [signatureBowls, setSignatureBowls] = useState<SigBowl[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [lastAppliedSignature, setLastAppliedSignature] = useState<string | null>(null);
  const [bowlName, setBowlName] = useState<string>("");
  const [bowlNameCustom, setBowlNameCustom] = useState(false);
  const [signatureSnapshot, setSignatureSnapshot] = useState<{ name: string; ingredients: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  // Restore hydration flag after first render (used by other effects)
  useEffect(() => { setHydrated(true); }, []);

  // Load items + signature bowls from Supabase
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Visibility for debugging — confirm env vars + URL the client is hitting
        console.log("[nutrition] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log("[nutrition] Anon key present:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "len:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);

        const { data: rawItems, error: itemErr } = await supabase
          .from("items")
          .select("id,name_en,name_vn,category,kind,tossful_portion_g,notes")
          .eq("in_menu", true)
          .eq("active", true)
          .in("category", ["Base", "Topping", "Premium", "Dressing", "Signature"])
          .order("category", { ascending: true })
          .order("name_en", { ascending: true });
        if (itemErr) {
          console.error("[nutrition] items fetch error:", itemErr);
          throw new Error(`items: ${itemErr.message}`);
        }
        console.log("[nutrition] items returned:", rawItems?.length ?? 0);

        const { data: nutrition, error: nutErr } = await supabase
          .from("item_nutrition")
          .select("*");
        if (nutErr) {
          console.error("[nutrition] item_nutrition fetch error:", nutErr);
          throw new Error(`item_nutrition: ${nutErr.message}`);
        }
        console.log("[nutrition] item_nutrition rows:", nutrition?.length ?? 0);

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
    setSignatureSnapshot(null);
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
      // Snapshot the signature's ingredient set so we can detect modifications
      // and append the "(custom)" suffix when the customer tweaks it.
      setSignatureSnapshot({ name: bowl.name, ingredients: Object.keys(next).sort() });
      setBowlName(bowl.name);
      setBowlNameCustom(false);
      setView("edit");
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [items, signatureBowls]
  );

  // ===== Render =====
  const str = I18N[lang];
  const items_by_cat = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const i of items) (map[i.category] = map[i.category] ?? []).push(i);
    return map;
  }, [items]);

  // Auto-suggest bowl name from current selection (unless user has typed manually).
  // If the customer started from a signature, name = signature when unchanged,
  // or "<signature> (custom)" once ingredients differ. If they remove ALL of the
  // signature's ingredients, drop the snapshot and fall back to BYO auto-naming.
  useEffect(() => {
    if (bowlNameCustom) return;
    if (signatureSnapshot) {
      const currentIds = Object.keys(selected);
      const currentSet = new Set(currentIds);
      const snapSet = new Set(signatureSnapshot.ingredients);
      let overlap = 0;
      for (const id of currentSet) if (snapSet.has(id)) overlap += 1;
      const fullMatch = overlap === snapSet.size && currentSet.size === snapSet.size;
      if (fullMatch) {
        setBowlName(signatureSnapshot.name);
        return;
      }
      if (overlap > 0) {
        setBowlName(signatureSnapshot.name + " " + I18N[lang].signature_modified_suffix);
        return;
      }
      // No overlap with the signature anymore — drop snapshot, use BYO naming
      setSignatureSnapshot(null);
    }
    setBowlName(suggestBowlName(selected, items, lang));
  }, [selected, items, lang, bowlNameCustom, signatureSnapshot]);

  // Save handler — Bundle 2 M2 wedge
  const handleSave = useCallback(async () => {
    setSaveError(null);
    if (Object.keys(selected).length === 0) {
      setSaveError(I18N[lang].empty_alert);
      return;
    }
    setSaving(true);

    // Build composition + macros payload
    const byCategory: Record<string, Item[]> = {};
    for (const id of Object.keys(selected)) {
      const item = items.find((i) => i.id === id);
      if (!item) continue;
      (byCategory[item.category] = byCategory[item.category] ?? []).push(item);
    }
    const toEntry = (item: Item) => ({
      id: item.id,
      name: pickName(item, lang),
      grams: (item.tossful_portion_g ?? 0) * (selected[item.id] ?? 1),
    });
    const composition: BowlComposition = {
      schema_version: 1,
      base: (byCategory["Base"] ?? [])[0] ? toEntry((byCategory["Base"] ?? [])[0]) : undefined,
      proteins: (byCategory["Premium"] ?? []).map(toEntry),
      toppings: (byCategory["Topping"] ?? []).map(toEntry),
      dressing: (byCategory["Dressing"] ?? [])[0] ? toEntry((byCategory["Dressing"] ?? [])[0]) : undefined,
      notes: lastAppliedSignature ? "From signature: " + lastAppliedSignature : undefined,
    };
    const payload = {
      name: bowlName.trim() || I18N[lang].your_bowl,
      composition,
      kcal: Math.round(totals.cal),
      protein_g: Number(totals.protein.toFixed(1)),
      fat_g: Number(totals.fat.toFixed(1)),
      carbs_g: Number(totals.carbs.toFixed(1)),
      fibre_g: Number(totals.fiber.toFixed(1)),
      source_url: "/nutrition",
    };

    // Check auth state
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const result = await saveBowl(payload);
      setSaving(false);
      if ("error" in result) {
        setSaveError(result.error);
        return;
      }
      router.push("/account/bowls/" + result.id);
    } else {
      // Guest: stash to localStorage + redirect to login -> /account claims it
      try {
        window.localStorage.setItem(
          "tossful:pending_bowl",
          JSON.stringify(payload),
        );
      } catch {
        // localStorage might be full/disabled — surface error
        setSaving(false);
        setSaveError("Could not save locally. Please sign in first.");
        return;
      }
      router.push("/login?next=/account");
    }
  }, [selected, items, lang, bowlName, totals, lastAppliedSignature, supabase, router]);

  return (
    <div className="tossful-calc">
      <div className="app">
        {/* Step 1: choose starter (default) */}
        {view === "choose" && (
          <>
            <div className="hero">
              <h1>{str.hero_title}</h1>
              <div className="tagline">{str.page_title} &middot; {str.page_subtitle}</div>
              <p className="choose-q">{str.choose_q}</p>
            </div>
            <div className="starter-stack">
              <button className="starter-card" onClick={() => setView("browse-signature")}>
                <div className="starter-ico"><i className="ti ti-salad" aria-hidden="true" /></div>
                <div className="starter-body">
                  <div className="starter-title">{str.start_sig}</div>
                  <div className="starter-desc">{str.start_sig_desc}</div>
                </div>
                <i className="ti ti-chevron-right starter-arrow" aria-hidden="true" />
              </button>
              <button
                className="starter-card"
                onClick={() => {
                  setLastAppliedSignature(null);
                  setSelected({});
                  setBowlName("");
                  setBowlNameCustom(false);
                  setSignatureSnapshot(null);
                  setView("edit");
                }}
              >
                <div className="starter-ico"><i className="ti ti-sparkles" aria-hidden="true" /></div>
                <div className="starter-body">
                  <div className="starter-title">{str.start_byo}</div>
                  <div className="starter-desc">{str.start_byo_desc}</div>
                </div>
                <i className="ti ti-chevron-right starter-arrow" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {/* Step 1b: browse signature bowls */}
        {view === "browse-signature" && (
          <>
            <button className="back-link" onClick={() => setView("choose")}>
              <i className="ti ti-arrow-left" aria-hidden="true" /> {str.back_to_start}
            </button>
            <div className="hero">
              <h1>{str.browse_h}</h1>
              <p>{str.browse_sub}</p>
            </div>
          </>
        )}

        {/* Step 2: edit (BYO) */}
        {view === "edit" && (
          <>
            <button className="back-link" onClick={() => setView("choose")}>
              <i className="ti ti-arrow-left" aria-hidden="true" /> {str.back_to_start}
            </button>
            <div className="hero">
              <h1>{str.hero_title}</h1>
              <div className="tagline">{str.page_title} &middot; {str.page_subtitle}</div>
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
                        <svg className="nring" viewBox="0 0 72 72">
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

        {/* Browse signature: list of cards */}
        {view === "browse-signature" && (
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

        {/* Edit (BYO) view */}
        {view === "edit" && (
          <div id="content">
            {loading && <div className="loader">Loading ingredients...</div>}
            {error && <div className="err">Failed to load ingredients: {error}</div>}
            {!loading && !error && items.length === 0 && (
              <div className="err">
                No ingredients returned from Supabase. Open the browser console
                (F12) and check for errors. Likely causes: env vars missing in
                Vercel, RLS blocking anon SELECT, or wrong table names.
              </div>
            )}
            {!loading && !error && items.length > 0 &&
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


        {/* Bowl-building chrome footer — only shown in edit view */}
        {view === "edit" && (
          <>
            <div className="name-row">
              <input
                className="name-input"
                type="text"
                maxLength={60}
                placeholder={str.bowl_name_placeholder}
                value={bowlName}
                onChange={(e) => {
                  setBowlName(e.target.value);
                  setBowlNameCustom(true);
                }}
              />
              {!bowlNameCustom && bowlName && (
                <div className="name-suggest-note">{str.bowl_name_hint}</div>
              )}
            </div>
            <div className="foot">
              <button className="btn ghost" onClick={() => { reset(); setBowlNameCustom(false); }}>
                {str.reset}
              </button>
              <button
                className="btn kale"
                onClick={handleSave}
                disabled={saving || Object.keys(selected).length === 0}
              >
                {saving ? str.saving : str.save_bowl}
              </button>
            </div>
            {saveError && <div className="save-error">{saveError}</div>}
            <div className="foot-note">{str.microcopy}</div>
          </>
        )}
      </div>
    </div>
  );
}

// trailing buffer
