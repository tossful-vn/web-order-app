"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { BYW_STR } from "./i18n";
import MacroPanel from "@/lib/components/MacroPanel";
import { addWeekItem, removeWeekItem } from "@/lib/weeks/actions";

type Macros = {
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fibre_g: number | null;
};
type BowlMin = { id: string; name: string; is_favourite?: boolean | null } & Macros;
type AddonMin = {
  id: string;
  kind: "drink" | "food" | "wrap" | "side";
  name_en: string;
  name_vn: string | null;
} & Macros;

type WeekItemRow = {
  id: string;
  week_id: string;
  user_id: string;
  day_index: number;
  item_kind: "bowl" | "drink" | "food" | "wrap" | "side" | "custom";
  bowl_id: string | null;
  addon_id: string | null;
  custom_name: string | null;
  custom_kcal: number | null;
  custom_protein_g: number | null;
  custom_fat_g: number | null;
  custom_carbs_g: number | null;
  custom_fibre_g: number | null;
  sort_order: number;
  bowl: BowlMin | null;
  addon: AddonMin | null;
};

type Signature = {
  id: string;
  name_en: string;
  name_vn: string | null;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fibre_g: number;
};

type Props = {
  weekId: string;
  items: WeekItemRow[];
  savedBowls: BowlMin[];
  addons: AddonMin[];
  signatures: Signature[];
};

function macrosOf(item: WeekItemRow) {
  const num = (v: number | null | undefined) => Number(v ?? 0);
  if (item.item_kind === "bowl" && item.bowl) {
    return { cal: num(item.bowl.kcal), protein: num(item.bowl.protein_g), fat: num(item.bowl.fat_g), carbs: num(item.bowl.carbs_g), fibre: num(item.bowl.fibre_g) };
  }
  if ((item.item_kind === "drink" || item.item_kind === "food" || item.item_kind === "wrap" || item.item_kind === "side") && item.addon) {
    return { cal: num(item.addon.kcal), protein: num(item.addon.protein_g), fat: num(item.addon.fat_g), carbs: num(item.addon.carbs_g), fibre: num(item.addon.fibre_g) };
  }
  if (item.item_kind === "custom") {
    return { cal: num(item.custom_kcal), protein: num(item.custom_protein_g), fat: num(item.custom_fat_g), carbs: num(item.custom_carbs_g), fibre: num(item.custom_fibre_g) };
  }
  return { cal: 0, protein: 0, fat: 0, carbs: 0, fibre: 0 };
}

function nameOf(item: WeekItemRow, lang: "en" | "vi"): string {
  if (item.item_kind === "bowl") return item.bowl?.name ?? "Bowl";
  if (item.addon) return (lang === "vi" && item.addon.name_vn) ? item.addon.name_vn : item.addon.name_en;
  if (item.item_kind === "custom") return item.custom_name ?? "";
  return "";
}

function iconOf(kind: WeekItemRow["item_kind"]): string {
  if (kind === "bowl") return "B";
  if (kind === "drink") return "D";
  if (kind === "wrap") return "W";
  if (kind === "side") return "S";
  if (kind === "food") return "F";
  return "?";
}

export default function Planner({ weekId: _weekId, items, savedBowls, addons, signatures }: Props) {
  const [lang] = useLang();
  const str = BYW_STR[lang];
  const router = useRouter();
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [pickerTab, setPickerTab] = useState<"bowl" | "tossful" | "drink" | "custom">("bowl");
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const [cName, setCName] = useState("");
  const [cKcal, setCKcal] = useState("");
  const [cProtein, setCProtein] = useState("");
  const [cFat, setCFat] = useState("");
  const [cCarbs, setCCarbs] = useState("");
  const [cFibre, setCFibre] = useState("");

  const itemsByDay = useMemo(() => {
    const map: WeekItemRow[][] = [[], [], [], [], [], [], []];
    for (const item of items) {
      const idx = Math.max(0, Math.min(6, item.day_index));
      map[idx].push(item);
    }
    return map;
  }, [items]);

  const dayTotals = useMemo(() => {
    return itemsByDay.map((dayItems) => {
      const t = { cal: 0, protein: 0, fat: 0, carbs: 0, fibre: 0 };
      for (const it of dayItems) {
        const m = macrosOf(it);
        t.cal += m.cal; t.protein += m.protein; t.fat += m.fat; t.carbs += m.carbs; t.fibre += m.fibre;
      }
      return t;
    });
  }, [itemsByDay]);

  function closePicker() {
    setOpenDay(null);
    setPickerErr(null);
    setPickerTab("bowl");
    setCName(""); setCKcal(""); setCProtein(""); setCFat(""); setCCarbs(""); setCFibre("");
  }

  function handleAdd(args: Parameters<typeof addWeekItem>[0]) {
    setPickerErr(null);
    startTransition(async () => {
      const res = await addWeekItem(args);
      if ("error" in res) { setPickerErr(res.error); return; }
      closePicker();
      router.refresh();
    });
  }

  function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!cName.trim()) { setPickerErr(str.custom_name_label); return; }
    if (openDay === null) return;
    handleAdd({
      dayIndex: openDay as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      itemKind: "custom",
      customName: cName.trim(),
      customKcal: cKcal ? Number(cKcal) : undefined,
      customProteinG: cProtein ? Number(cProtein) : undefined,
      customFatG: cFat ? Number(cFat) : undefined,
      customCarbsG: cCarbs ? Number(cCarbs) : undefined,
      customFibreG: cFibre ? Number(cFibre) : undefined,
    });
  }

  const macroLabels = { cal: str.macro_cal, protein: str.macro_protein, fat: str.macro_fat, carbs: str.macro_carbs, fiber: str.macro_fiber };

  // Must Try — favourited saved bowls, surfaced at the top
  const mustTryBowls = savedBowls.filter((b) => b.is_favourite === true);

  return (
    <div className="byw-page">
      <div className="byw-app">
        <h1 className="byw-hero-h1">{str.page_title}</h1>
        <p className="byw-hero-p">{str.page_sub}</p>

        {/* Must Try — favourited saved bowls */}
        <section className="must-try-section">
          <div className="must-try-head">
            <h2 className="must-try-h2">
              <span className="must-try-heart" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#F68C02" stroke="#F68C02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </span>
              {str.must_try}
              {mustTryBowls.length > 0 && (
                <span className="must-try-count">{mustTryBowls.length}</span>
              )}
            </h2>
          </div>
          {mustTryBowls.length === 0 ? (
            <div className="must-try-empty">
              <p>{str.must_try_empty}</p>
              <Link href="/account" className="must-try-empty-cta">
                {str.must_try_open} →
              </Link>
            </div>
          ) : (
            <div className="must-try-row">
              {mustTryBowls.map((b) => (
                <Link
                  key={b.id}
                  href={`/account/bowls/${b.id}`}
                  className="must-try-card"
                >
                  <div className="must-try-card-name">{b.name}</div>
                  <div className="must-try-card-macros">
                    <span className="m">
                      <strong>{Math.round(Number(b.kcal ?? 0))}</strong> {str.macro_cal.toLowerCase()}
                    </span>
                    <span className="m">
                      <strong>{Math.round(Number(b.protein_g ?? 0))}g</strong> {str.macro_protein.toLowerCase()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {[0, 1, 2, 3, 4, 5, 6].map((d) => {
          const dayItems = itemsByDay[d];
          const isEmpty = dayItems.length === 0;
          const totals = dayTotals[d];
          return (
            <div key={d} className={"day-card" + (isEmpty ? " empty" : "")}>
              <div className="day-head">
                <span className="day">{str.days[d]}</span>
                {isEmpty ? (
                  <span className="empty-tag">{str.empty_day}</span>
                ) : (
                  <span className="cal">{str.item_count(dayItems.length)}</span>
                )}
              </div>

              <MacroPanel
                totals={totals}
                label={str.week_label}
                macroLabels={macroLabels}
                dim={isEmpty}
              />

              {!isEmpty && (
                <div className="day-items">
                  {dayItems.map((it) => {
                    const m = macrosOf(it);
                    return (
                      <div key={it.id} className={"day-item " + it.item_kind}>
                        <div className="ico">{iconOf(it.item_kind)}</div>
                        <span className="name">{nameOf(it, lang)}</span>
                        <span className="cal">{Math.round(m.cal)}</span>
                        <form action={removeWeekItem}>
                          <input type="hidden" name="id" value={it.id} />
                          <button type="submit" className="x-btn" aria-label={str.remove}>&times;</button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}

              <button className="add-item-btn" onClick={() => setOpenDay(d)}>
                + {isEmpty ? str.add_first : str.add_item}
              </button>
            </div>
          );
        })}
      </div>

      {openDay !== null && (
        <div className="picker-backdrop" onClick={closePicker}>
          <div className="picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-head">
              <span className="title">{str.picker_add_to} {str.days[openDay]}</span>
              <button type="button" className="close" onClick={closePicker} aria-label={str.picker_close}>&times;</button>
            </div>

            <div className="picker-tabs">
              <button className={pickerTab === "bowl" ? "on" : ""} onClick={() => setPickerTab("bowl")}>{str.picker_my_bowls}</button>
              <button className={pickerTab === "tossful" ? "on" : ""} onClick={() => setPickerTab("tossful")}>{str.picker_tossful}</button>
              <button className={pickerTab === "drink" ? "on" : ""} onClick={() => setPickerTab("drink")}>{str.picker_drinks}</button>
              <button className={pickerTab === "custom" ? "on" : ""} onClick={() => setPickerTab("custom")}>{str.picker_custom}</button>
            </div>

            <div className="picker-body">
              {pickerErr && <div className="picker-err">{pickerErr}</div>}

              {pickerTab === "bowl" && (
                <div className="picker-list">
                  {savedBowls.length === 0 ? (
                    <div className="picker-empty">
                      <div className="msg">{str.picker_no_bowls}</div>
                      <Link href="/nutrition">{str.picker_open_calc}</Link>
                    </div>
                  ) : (
                    savedBowls.map((b) => (
                      <button
                        key={b.id}
                        className="picker-option"
                        disabled={busy}
                        onClick={() => handleAdd({ dayIndex: openDay as 0|1|2|3|4|5|6, itemKind: "bowl", bowlId: b.id })}
                      >
                        <div className="ico">B</div>
                        <div className="body">
                          <div className="name">{b.name}</div>
                          <div className="macros">{Math.round(Number(b.kcal ?? 0))} cal &middot; {Number(b.protein_g ?? 0).toFixed(0)}g protein</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {pickerTab === "drink" && (
                <div className="picker-list">
                  {addons.filter((a) => a.kind === "drink").map((a) => (
                    <button
                      key={a.id}
                      className="picker-option"
                      disabled={busy}
                      onClick={() => handleAdd({ dayIndex: openDay as 0|1|2|3|4|5|6, itemKind: "drink", addonId: a.id })}
                    >
                      <div className="ico" style={{ background: "#F68C02", color: "#fff" }}>D</div>
                      <div className="body">
                        <div className="name">{(lang === "vi" && a.name_vn) ? a.name_vn : a.name_en}</div>
                        <div className="macros">{Math.round(Number(a.kcal ?? 0))} cal &middot; {Number(a.protein_g ?? 0).toFixed(0)}g protein</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {pickerTab === "tossful" && (
                <div className="picker-list">
                  {signatures.map((s) => (
                    <button
                      key={`sig-${s.id}`}
                      className="picker-option"
                      disabled={busy}
                      onClick={() => handleAdd({
                        dayIndex: openDay as 0|1|2|3|4|5|6,
                        itemKind: "custom",
                        customName: (lang === "vi" && s.name_vn) ? s.name_vn : s.name_en,
                        customKcal: s.kcal,
                        customProteinG: s.protein_g,
                        customFatG: s.fat_g,
                        customCarbsG: s.carbs_g,
                        customFibreG: s.fibre_g,
                      })}
                    >
                      <div className="ico" style={{ background: "#C0DD97", color: "#0F563D" }}>B</div>
                      <div className="body">
                        <div className="name">{(lang === "vi" && s.name_vn) ? s.name_vn : s.name_en}</div>
                        <div className="macros">{s.kcal} cal &middot; {s.protein_g.toFixed(0)}g protein</div>
                      </div>
                    </button>
                  ))}
                  {addons.filter((a) => a.kind === "wrap").map((a) => (
                    <button
                      key={`wrap-${a.id}`}
                      className="picker-option"
                      disabled={busy}
                      onClick={() => handleAdd({ dayIndex: openDay as 0|1|2|3|4|5|6, itemKind: "wrap", addonId: a.id })}
                    >
                      <div className="ico" style={{ background: "#FFE9C2", color: "#7D291A" }}>W</div>
                      <div className="body">
                        <div className="name">{(lang === "vi" && a.name_vn) ? a.name_vn : a.name_en}</div>
                        <div className="macros">{Math.round(Number(a.kcal ?? 0))} cal &middot; {Number(a.protein_g ?? 0).toFixed(0)}g protein</div>
                      </div>
                    </button>
                  ))}
                  {addons.filter((a) => a.kind === "side").map((a) => (
                    <button
                      key={`side-${a.id}`}
                      className="picker-option"
                      disabled={busy}
                      onClick={() => handleAdd({ dayIndex: openDay as 0|1|2|3|4|5|6, itemKind: "side", addonId: a.id })}
                    >
                      <div className="ico" style={{ background: "#F8E3F3", color: "#7D291A" }}>S</div>
                      <div className="body">
                        <div className="name">{(lang === "vi" && a.name_vn) ? a.name_vn : a.name_en}</div>
                        <div className="macros">{Math.round(Number(a.kcal ?? 0))} cal &middot; {Number(a.protein_g ?? 0).toFixed(0)}g protein</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {pickerTab === "custom" && (
                <form className="custom-form" onSubmit={handleAddCustom}>
                  <div>
                    <label>{str.custom_name_label}</label>
                    <input type="text" value={cName} onChange={(e) => setCName(e.target.value)} placeholder={str.custom_name_ph} maxLength={80} required />
                  </div>
                  <div>
                    <label>{str.custom_kcal_label}</label>
                    <input type="number" min="0" max="3000" value={cKcal} onChange={(e) => setCKcal(e.target.value)} placeholder="0" />
                  </div>
                  <div className="row2">
                    <div>
                      <label>{str.custom_protein_label}</label>
                      <input type="number" min="0" max="500" step="0.1" value={cProtein} onChange={(e) => setCProtein(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label>{str.custom_fat_label}</label>
                      <input type="number" min="0" max="500" step="0.1" value={cFat} onChange={(e) => setCFat(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  <div className="row2">
                    <div>
                      <label>{str.custom_carbs_label}</label>
                      <input type="number" min="0" max="500" step="0.1" value={cCarbs} onChange={(e) => setCCarbs(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label>{str.custom_fibre_label}</label>
                      <input type="number" min="0" max="500" step="0.1" value={cFibre} onChange={(e) => setCFibre(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  <button type="submit" className="submit" disabled={busy}>{str.custom_save}</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// trailing buffer
