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
  lookupSignaturePhoto,
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
  in_menu: boolean;
  customizable?: boolean;
  is_best_seller?: boolean | null;
  nutrition?: Nutrition | null;
  price_vnd_hcm?: number | null;
  price_vnd_hn?: number | null;
};

type StoreCity = "HN" | "HCM";

// Format VND price as compact "Xk đ" or "Xk.Y đ" (e.g. 125000 → "125k đ", 109000 → "109k đ")
function formatPrice(vnd: number | null | undefined): string {
  if (!vnd || vnd <= 0) return "";
  if (vnd >= 1000) {
    const k = vnd / 1000;
    // Use one decimal only if not whole (15500 → "15.5k đ")
    const formatted = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1);
    return `${formatted}k đ`;
  }
  return `${vnd} đ`;
}

function priceFor(item: Item | undefined, store: StoreCity): number {
  if (!item) return 0;
  return (store === "HCM" ? item.price_vnd_hcm : item.price_vnd_hn) ?? 0;
}

/** Component from a signature recipe that the customer cannot edit. */
type LockedComponent = {
  id: string;
  name_en: string;
  name_vn: string | null;
  category: string;
  quantity_g: number;
  nutrition: Nutrition | null;
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
  customizable: boolean;
  isBestSeller: boolean;
  components: RecipeComponent[];
  /** Non-in_menu components — included if customer customizes this signature. */
  lockedComponents: LockedComponent[];
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

/**
 * Display-time rename for signature variants.
 * DB stores legacy convention "<X> - Wrap"; brand convention is "WRAP | <X>".
 * Bowl signatures pass through unchanged. Photo lookup in photo-maps.ts
 * recognises both conventions, so we never have to migrate the DB.
 */
function formatSigName(rawName: string): string {
  const wrapMatch = rawName.match(/^(.+?)\s*-\s*Wrap\s*$/i);
  if (wrapMatch) return `WRAP | ${wrapMatch[1].trim()}`;
  return rawName;
}

// Simple deterministic string hash → use to pick a template per ingredient set
// so same bowl always gets the same name (not random each render).
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function suggestBowlName(
  selected: Record<string, number>,
  items: Item[],
  lang: Lang,
): string {
  const ids = Object.keys(selected).sort();
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
  const h = hashStr(ids.join(","));

  if (lang === "vi") {
    // Witty Vietnamese templates — pick deterministically by ingredient-set hash.
    // Each template references zero-to-many ingredients; only templates that
    // fit the current selection are eligible.
    type T = { ok: boolean; render: () => string };
    const templates: T[] = [
      { ok: !!(base && protein), render: () => `${n(protein)} Bùng Vị ${n(base)}` },
      { ok: !!(base && protein), render: () => `Combo ${n(protein)} ${n(base)} Đỉnh Cao` },
      { ok: !!(base && protein), render: () => `Tô ${n(protein)} Mê Đắm` },
      { ok: !!(base && topping), render: () => `${n(base)} Cười Tươi` },
      { ok: !!(base && topping), render: () => `Tô ${n(base)} Hảo Hạng` },
      { ok: !!(base && dressing), render: () => `${n(base)} Sốt ${n(dressing)} Quyến Rũ` },
      { ok: !!protein, render: () => `Tô ${n(protein)} Vui Vẻ` },
      { ok: !!base, render: () => `Vương Quốc ${n(base)}` },
      { ok: !!topping, render: () => `Tô Có ${n(topping)} Là Vui` },
      { ok: !!dressing, render: () => `Sốt ${n(dressing)} Là Đỉnh` },
      { ok: picked.length >= 5, render: () => "Tô Đỉnh Của Đỉnh" },
      { ok: picked.length >= 3, render: () => "Tô Tươi Mát Hôm Nay" },
      { ok: true, render: () => "Tô Cá Tính" },
    ];
    const eligible = templates.filter((t) => t.ok);
    return eligible[h % eligible.length].render();
  }

  // English — same approach, brand-voice witty templates
  type T = { ok: boolean; render: () => string };
  const templates: T[] = [
    { ok: !!(base && protein), render: () => `${n(protein)} Meets ${n(base)}` },
    { ok: !!(base && protein), render: () => `The ${n(protein)} Bowl Saga` },
    { ok: !!(base && protein), render: () => `${n(protein)} on a ${n(base)} Throne` },
    { ok: !!(base && topping), render: () => `${n(base)} Goes Wild` },
    { ok: !!(base && topping), render: () => `${n(topping)}-Topped Triumph` },
    { ok: !!(base && dressing), render: () => `${n(dressing)} Affair with ${n(base)}` },
    { ok: !!protein, render: () => `The ${n(protein)} Wake-Up` },
    { ok: !!base, render: () => `${n(base)} Symphony` },
    { ok: !!topping, render: () => `Hold the Doubt, Pile the ${n(topping)}` },
    { ok: !!dressing, render: () => `${n(dressing)} Frenzy` },
    { ok: picked.length >= 5, render: () => "The Whole Garden Bowl" },
    { ok: picked.length >= 3, render: () => "Today's Mood Bowl" },
    { ok: true, render: () => "Bowled Over" },
  ];
  const eligible = templates.filter((t) => t.ok);
  return eligible[h % eligible.length].render();
}

// ===== Component =====
export default function Calculator() {
  const supabase = useMemo(() => createClient(), []);
  const [userName, setUserName] = useState<string | null>(null);
  const [store, setStore] = useState<StoreCity>("HN"); // default HN (cheaper menu)
  // Saved bowls (compressed to {name, sortedIds}) for combo-match labelling.
  // Lets the macro-bar pill show the saved-bowl's name when the customer
  // builds the same combination again later.
  const [savedBowlsForMatch, setSavedBowlsForMatch] = useState<Array<{ name: string; ids: string[] }>>([]);
  useEffect(() => {
    // Pull profile display_name + preferred_store + saved bowl combos on
    // mount. Anonymous visitors render generic copy and default store (HN).
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const [{ data: profile }, { data: savedBowls }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, preferred_store")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("saved_bowls")
          .select("name, composition")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(80),
      ]);
      if (cancelled) return;
      const dn = (profile?.display_name ?? "").trim();
      if (dn) {
        setUserName(dn.split(/\s+/)[0]); // first word only — friendlier
      } else if (user.email) {
        // Fallback: email local-part, capitalised
        const local = user.email.split("@")[0];
        setUserName(local.charAt(0).toUpperCase() + local.slice(1));
      }
      const ps = (profile?.preferred_store ?? "").trim().toUpperCase();
      if (ps === "HCM" || ps === "HCMC" || ps === "SAIGON" || ps === "HỒ CHÍ MINH") {
        setStore("HCM");
      } else if (ps === "HN" || ps === "HANOI" || ps === "HÀ NỘI") {
        setStore("HN");
      }
      // Compress saved bowls to {name, sortedIds} for fast equality compare.
      // We only need ids; quantities aren't tracked in composition the same
      // way as `selected`, but the use case is "did the customer build the
      // same set of ingredients again" — id-set match is enough.
      type Composition = {
        base?: { id?: string } | null;
        cot?: { id?: string } | null;
        toppings?: Array<{ id?: string }> | null;
        proteins?: Array<{ id?: string }> | null;
        dressing?: { id?: string } | null;
        xot?: { id?: string } | null;
        fixed?: Array<{ id?: string }> | null;
      };
      const compressed: Array<{ name: string; ids: string[] }> = [];
      for (const sb of (savedBowls ?? []) as Array<{ name: string; composition: Composition | null }>) {
        const comp = sb.composition ?? {};
        const ids = new Set<string>();
        const push = (i?: { id?: string } | null) => { if (i?.id) ids.add(i.id); };
        push(comp.base);
        push(comp.cot);
        push(comp.dressing);
        push(comp.xot);
        (comp.toppings ?? []).forEach(push);
        (comp.proteins ?? []).forEach(push);
        (comp.fixed ?? []).forEach(push);
        if (ids.size > 0) {
          compressed.push({ name: sb.name, ids: [...ids].sort() });
        }
      }
      setSavedBowlsForMatch(compressed);
    })();
    return () => { cancelled = true; };
  }, [supabase]);



  // Personalize template strings — replaces {name} when we have one,
  // falls back to the generic version otherwise.
  const personalize = useCallback((template: string, fallback: string): string => {
    if (!userName) return fallback;
    return template.replace(/\{name\}/g, userName);
  }, [userName]);

  const [lang] = useLang();
  const [view, setView] = useState<View>("choose");
  const [items, setItems] = useState<Item[]>([]);
  const [signatureBowls, setSignatureBowls] = useState<SigBowl[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [lastAppliedSignature, setLastAppliedSignature] = useState<string | null>(null);
  const [bowlName, setBowlName] = useState<string>("");
  const [bowlNameCustom, setBowlNameCustom] = useState(false);
  const [signatureSnapshot, setSignatureSnapshot] = useState<{ name: string; ingredients: string[] } | null>(null);
  /**
   * Components included by the currently-applied signature that the customer
   * cannot remove (e.g. tortilla in a wrap variant). Their macros are added
   * to totals and they're saved into composition.fixed[] on save.
   */
  const [lockedComponents, setLockedComponents] = useState<LockedComponent[]>([]);
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

        // NOTE: do NOT filter on in_menu here. Some recipe components (e.g.
        // tortilla in wrap variants) are staff-only items with in_menu=false,
        // and the calculator needs their nutrition to compute wrap macros. The
        // BYO picker filters by in_menu downstream when building byoItems.
        const { data: rawItems, error: itemErr } = await supabase
          .from("items")
          .select("id,name_en,name_vn,category,kind,tossful_portion_g,notes,in_menu,customizable,is_best_seller,price_vnd_hcm,price_vnd_hn")
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
            // Locked components: any recipe component whose item is NOT in_menu
            // (e.g. the tortilla in a wrap variant). These can't be removed by
            // the customer in BYO edit mode and are auto-included in totals.
            const lockedComponents: LockedComponent[] = [];
            for (const c of components) {
              const ci = enriched.find((i) => i.id === c.component_id);
              if (!ci) continue;
              if (ci.in_menu) continue;
              lockedComponents.push({
                id: ci.id,
                name_en: ci.name_en,
                name_vn: ci.name_vn,
                category: ci.category,
                quantity_g: c.quantity_g,
                nutrition: ci.nutrition ?? null,
              });
            }
            return {
              id: s.id,
              name: formatSigName(s.name_en),
              tagline,
              total_g: s.tossful_portion_g,
              customizable: s.customizable !== false, // default true if undefined
              isBestSeller: s.is_best_seller === true,
              components,
              lockedComponents,
              macros: computeBowlMacros(components, enriched),
            };
          });
        }

        // BYO picker only shows ingredient items that are in_menu.
        // (Tortilla and other staff-only components are fetched for the
        // signature/wrap macro calc but excluded from the picker.)
        const byoItems = enriched.filter(
          (i) => i.category !== "Signature" && i.in_menu,
        );

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
    // Add macros from locked components (tortilla in wraps, etc.).
    for (const lc of lockedComponents) {
      if (!lc.nutrition) continue;
      const factor = lc.quantity_g / 100;
      out.cal += (lc.nutrition.calories ?? 0) * factor;
      out.protein += (lc.nutrition.protein_g ?? 0) * factor;
      out.fat += (lc.nutrition.total_fat_g ?? 0) * factor;
      out.carbs += (lc.nutrition.carbs_g ?? 0) * factor;
      out.fiber += (lc.nutrition.fiber_g ?? 0) * factor;
    }
    return out;
  }, [selected, items, lockedComponents]);

  const countsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [id, qty] of Object.entries(selected)) {
      const item = items.find((i) => i.id === id);
      if (!item) continue;
      counts[item.category] = (counts[item.category] ?? 0) + qty;
    }
    return counts;
  }, [selected, items]);

  // Find the signature Item (with menu price) backing the currently-applied
  // signature, if any. Match by name_en since lastAppliedSignature stores the
  // bowl's display name.
  const signatureItem = useMemo<Item | null>(() => {
    if (!lastAppliedSignature) return null;
    return (
      items.find(
        (i) => i.category === "Signature" && i.name_en === lastAppliedSignature,
      ) ?? null
    );
  }, [lastAppliedSignature, items]);

  // True when the current selection EXACTLY matches the snapshot taken at
  // signature-apply time: same ingredient IDs, no extras, every qty === 1.
  // Any modification (added/removed ingredient, qty bump) flips this false
  // and we revert to sum-of-ingredients pricing — signatures bundle a
  // discount that doesn't apply to customised bowls.
  const isPristineSignature = useMemo(() => {
    if (!signatureItem || !signatureSnapshot) return false;
    const currentIds = Object.keys(selected);
    if (currentIds.length !== signatureSnapshot.ingredients.length) return false;
    const snapSet = new Set(signatureSnapshot.ingredients);
    if (!currentIds.every((id) => snapSet.has(id))) return false;
    if (!currentIds.every((id) => selected[id] === 1)) return false;
    return true;
  }, [signatureItem, signatureSnapshot, selected]);

  // Find a saved bowl whose ingredient-id set exactly matches the current
  // selection. First match wins (most-recently-saved per query order).
  const matchedSavedBowlName = useMemo<string | null>(() => {
    const currentIds = Object.keys(selected);
    if (currentIds.length === 0) return null;
    const currentSet = new Set(currentIds);
    for (const sb of savedBowlsForMatch) {
      if (sb.ids.length !== currentIds.length) continue;
      if (sb.ids.every((id) => currentSet.has(id))) {
        return sb.name;
      }
    }
    return null;
  }, [selected, savedBowlsForMatch]);

  // Macro-bar pill label: signature name (pristine) → saved bowl name →
  // generic "Tô của bạn" fallback. Order matters — most-specific first.
  const barLabel = useMemo<string>(() => {
    if (isPristineSignature && signatureItem) {
      return pickName(signatureItem, lang);
    }
    if (matchedSavedBowlName) return matchedSavedBowlName;
    return I18N[lang].bowl_label;
  }, [isPristineSignature, signatureItem, matchedSavedBowlName, lang]);

  const summaryRows = useMemo(() => {
    const rows: { item: Item; qty: number; portion: number; cal: number; price: number }[] = [];
    let totalG = 0;
    let totalCal = 0;
    let totalPrice = 0;
    for (const cat of CATEGORY_ORDER) {
      for (const [id, qty] of Object.entries(selected)) {
        const item = items.find((i) => i.id === id);
        if (!item || item.category !== cat) continue;
        const portion = (item.tossful_portion_g ?? 0) * qty;
        const cal = macrosFor(item).calories * qty;
        const price = priceFor(item, store) * qty;
        totalG += portion;
        totalCal += cal;
        totalPrice += price;
        rows.push({ item, qty, portion, cal, price });
      }
    }
    // Signature discount: when bowl matches a signature exactly, price is
    // the signature's own menu price (bundled discount), not the sum.
    const finalPrice =
      isPristineSignature && signatureItem
        ? priceFor(signatureItem, store)
        : totalPrice;
    return { rows, totalG, totalCal, totalPrice: finalPrice, isSignaturePrice: isPristineSignature };
  }, [selected, items, store, isPristineSignature, signatureItem]);

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
    setLockedComponents([]);
  }, []);

  const useBowl = useCallback(
    (bowlId: string) => {
      const bowl = signatureBowls.find((b) => b.id === bowlId);
      if (!bowl) return;
      if (!bowl.customizable) return; // safety: button shouldn't be visible
      setLastAppliedSignature(bowl.name);
      const next: Record<string, number> = {};
      for (const comp of bowl.components) {
        const item = items.find((i) => i.id === comp.component_id);
        if (!item) continue;
        if (!(CATEGORY_ORDER as readonly string[]).includes(item.category)) continue;
        next[item.id] = next[item.id] ?? 1;
      }
      setSelected(next);
      // Locked components (e.g. tortilla in a wrap) — included in macros and
      // shown as read-only in edit mode, not removable by customer.
      setLockedComponents(bowl.lockedComponents);
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
      // Locked components (e.g. tortilla in a wrap) — stored separately so
      // the bowl detail page can render them with an "Included" badge and
      // they're never lost if categories change shape later.
      fixed: lockedComponents.length > 0
        ? lockedComponents.map((lc) => ({
            id: lc.id,
            name: lang === "vi" && lc.name_vn ? lc.name_vn : lc.name_en,
            grams: lc.quantity_g,
            category: lc.category,
          }))
        : undefined,
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
  }, [selected, items, lang, bowlName, totals, lastAppliedSignature, lockedComponents, supabase, router]);

  return (
    <div className="tossful-calc">
      <div className="app">
        {/* Step 1: choose starter (default) */}
        {view === "choose" && (
          <>
            <div className="hero">
              <h1>{personalize(str.hero_title_named, str.hero_title)}</h1>
              <div className="tagline">{personalize(str.page_title_named, str.page_title)} &middot; {str.page_subtitle}</div>
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
              <h1>{personalize(str.hero_title_named, str.hero_title)}</h1>
              <div className="tagline">{personalize(str.page_title_named, str.page_title)} &middot; {str.page_subtitle}</div>
              <p>{str.hero_subtitle}</p>
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
                // Build ingredient list — include both in_menu (in `items`) and
                // locked components (e.g. tortilla in wraps) so customer sees
                // everything that's in the dish.
                const inMenuNames = b.components
                  .map((c) => items.find((i) => i.id === c.component_id))
                  .filter((it): it is Item => !!it)
                  .map((it) => pickName(it, lang));
                const lockedNames = b.lockedComponents.map((lc) =>
                  lang === "vi" && lc.name_vn ? lc.name_vn : lc.name_en,
                );
                const ingsList = [...inMenuNames, ...lockedNames].join(" · ");
                const photo = lookupSignaturePhoto(b.name);
                return (
                  <div key={b.id} className="sig-card">
                    <div className="photo">
                      {photo ? (
                        <img src={`/nutrition/${photo}`} alt={b.name} loading="lazy" />
                      ) : (
                        <div className="ph">{b.name}</div>
                      )}
                      {b.isBestSeller && (
                        <svg
                          className="best-seller-badge"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                          role="img"
                          aria-label={lang === "vi" ? "Bán chạy" : "Best Seller"}
                        >
                          <title>{lang === "vi" ? "Bán chạy" : "Best Seller"}</title>
                          <path
                            fill="#F68C02"
                            d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48z"
                          />
                          <path
                            fill="#FFE9C2"
                            d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="body">
                      <h4>{b.name}</h4>
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
                      {b.customizable && (
                        <button className="use-btn" onClick={() => useBowl(b.id)}>
                          {str.start_from_bowl} <i className="ti ti-arrow-right" aria-hidden="true" />
                        </button>
                      )}
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
            {/* Locked components from the chosen signature (e.g. tortilla in a wrap).
                Read-only chips — counted in macros, can't be removed. */}
            {!loading && !error && lockedComponents.length > 0 && (
              <div className="section" data-locked="true">
                <div className="h">
                  <h3>{str.included_label}</h3>
                  <div className="meta">
                    <span className="hint">{str.included_hint}</span>
                  </div>
                </div>
                <div className="chips">
                  {lockedComponents.map((lc) => {
                    const displayName = lang === "vi" && lc.name_vn ? lc.name_vn : lc.name_en;
                    return (
                      <div
                        key={lc.id}
                        className="chip on locked"
                        aria-disabled="true"
                        style={{ cursor: "default", opacity: 0.85 }}
                      >
                        <span>{displayName}</span>
                        <span className="qty">{lc.quantity_g}g</span>
                      </div>
                    );
                  })}
                </div>
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
                  <span className="total-g">
                    {summaryRows.totalPrice > 0 && (
                      <span className="total-price" title={summaryRows.isSignaturePrice ? "Giá signature (đã bao gồm ưu đãi combo) · Signature price (combo discount applied)" : undefined}>
                        {formatPrice(summaryRows.totalPrice)}
                        {summaryRows.isSignaturePrice && (
                          <span className="signature-tag">signature</span>
                        )}
                      </span>
                    )}
                    <span className="total-g-num">{Math.round(summaryRows.totalG)} g</span>
                  </span>
                </h3>
                <div className="summary-list">
                  {summaryRows.rows.length === 0 ? (
                    <div className="empty">{str.empty_summary}</div>
                  ) : (
                    summaryRows.rows.map(({ item, qty, portion, cal, price }) => {
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
                          <span className="name">{pickName(item, lang)}</span>
                          <div className="qty-ctrl" aria-label={`Quantity ${qty}`}>
                            <button
                              type="button"
                              className="qty-btn"
                              aria-label={`Decrease ${pickName(item, lang)}`}
                              onClick={() => decrementQty(item)}
                            >
                              <i className="ti ti-minus" aria-hidden="true" />
                            </button>
                            <span className="qty-num">{qty}</span>
                            <button
                              type="button"
                              className="qty-btn"
                              aria-label={`Increase ${pickName(item, lang)}`}
                              onClick={() => incrementQty(item)}
                            >
                              <i className="ti ti-plus" aria-hidden="true" />
                            </button>
                          </div>
                          <div className="row-meta">
                            <span className="gram" title={`${Math.round(portion)}g`}>{Math.round(cal)} cal</span>
                            {price > 0 && <span className="row-price" title={`${price.toLocaleString("vi-VN")} đ`}>{formatPrice(price)}</span>}
                          </div>
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
              <label className="name-label" htmlFor="bowl-name-input">
                {str.bowl_name_label}
              </label>
              <input
                id="bowl-name-input"
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

            <div
              className="infographic"
              style={{ ["--bowl-label" as never]: `"${barLabel.replace(/"/g, '\\"')}"` }}
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
      </div>
    </div>
  );
}

// trailing buffer
