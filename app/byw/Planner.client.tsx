"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { BYW_STR } from "./i18n";
import { addWeekItem, removeWeekItem } from "@/lib/weeks/actions";

// Daily RDI baselines (same as calculator)
const RDI = { cal: 2000, protein: 50, fat: 70, carbs: 260, fibre: 28 };
const RING_C = 188.5;

type Macros = { kcal: number | null; protein_g: number | null; fat_g: number | null; carbs_g: number | null; fibre_g: number | null };
type BowlMin = { id: string; name: string } & Macros;
type AddonMin = { id: string; kind: "drink" | "food"; name_en: string; name_vn: string | null } & Macros;

type WeekItemRow = {
  id: string;
  week_id: string;
  user_id: string;
  day_index: number;
  item_kind: "bowl" | "drink" | "food" | "custom";
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

type Props = {
  weekId: string;
  items: WeekItemRow[];
  savedBowls: BowlMin[];
  addons: AddonMin[];
};

function macrosOf(item: WeekItemRow): { cal: number; protein: number; fat: number; carbs: number; fibre: number } {
  const num = (v: number | null | undefined) => Number(v ?? 0);
  if (item.item_kind === "bowl" && item.bowl) {
    return { cal: num(item.bowl.kcal), protein: num(item.bowl.protein_g), fat: num(item.bowl.fat_g), carbs: num(item.bowl.carbs_g), fibre: num(item.bowl.fibre_g) };
  }
  if ((item.item_kind === "drink" || item.item_kind === "food") && item.addon) {
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
  if (kind === "food") return "F";
  return "?";
}

function pctDash(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(value / target, 1) * RING_C;
}

function Rings({ totals, large, labelMap }: {
  totals: { cal: number; protein: number; fat: number; carbs: number; fibre: number };
  large: boolean;
  labelMap: { cal: string; protein: string; fat: string; carbs: string; fiber: string };
}) {
  const data: Array<{ key: "cal" | "protein" | "fat" | "carbs" | "fiber"; val: string; pct: number; lbl: string }> = [
    { key: "cal", val: Math.round(totals.cal).toLocaleString(), pct: pctDash(totals.cal, RDI.cal), lbl: labelMap.cal },
    { key: "protein", val: `${totals.protein.toFixed(0)}g`, pct: pctDash(totals.protein, RDI.protein), lbl: labelMap.protein },
    { key: "fat", val: `${totals.fat.toFixed(0)}g`, pct: pctDash(totals.fat, RDI.fat), lbl: labelMap.fat },
    { key: "carbs", val: `${totals.carbs.toFixed(0)}g`, pct: pctDash(totals.carbs, RDI.carbs), lbl: labelMap.carbs },
    { key: "fiber", val: `${totals.fibre.toFixed(0)}g`, pct: pctDash(totals.fibre, RDI.fibre), lbl: labelMap.fiber },
  ];
  return (
    <div className="igrid">
      {data.map((d) => (
        <div key={d.key} className={large ? "ring-item" : "dring"} data-m={d.key}>
          <div className={large ? "ring-wrap" : "dring-wrap"}>
            <svg viewBox="0 0 72 72">
              <circle className="bg" cx={36} cy={36} r={30} />
              <circle className="fg" cx={36} cy={36} r={30} style={{ strokeDasharray: `${d.pct} ${RING_C}` }} />
            </svg>
            <div className={large ? "ring-center" : "dring-center"}>
              <div className="val">{d.val}</div>
              <div className="lbl">{d.lbl}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Planner({ weekId: _weekId, items, savedBowls, addons }: Props) {
  const [lang] = useLang();
  const str = BYW_STR[lang];
  const router = useRouter();
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [pickerTab, setPickerTab] = useState<"bowl" | "drink" | "food" | "custom">("bowl");
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  // Custom form state (per-open of picker)
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

  const weekTotals = useMemo(() => {
    const t = { cal: 0, protein: 0, fat: 0, carbs: 0, fibre: 0 };
    for (const day of dayTotals) {
      t.cal += day.cal; t.protein += day.protein; t.fat += day.fat; t.carbs += day.carbs; t.fibre += day.fibre;
    }
    return t;
  }, [dayTotals]);

  // Week-aggregate vs 7x daily RDI: scale targets by 7
  const weekRdiScaled = { cal: weekTotals.cal / 7, protein: weekTotals.protein / 7, fat: weekTotals.fat / 7, carbs: weekTotals.carbs / 7, fibre: weekTotals.fibre / 7 };
  // Show actual week numbers in center but ring fill = % of 7x daily RDI
  const weekDisplayTotals = weekTotals;

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
      if ("error" in res) {
        setPickerErr(res.error);
        return;
      }
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

  const labelMap = { cal: str.macro_cal, protein: str.macro_protein, fat: str.macro_fat, carbs: str.macro_carbs, fiber: str.macro_fiber };

  return (
    <div className="byw-page">
      <div className="byw-app">
        <h1 className="byw-hero-h1">{str.page_title}</h1>
        <p className="byw-hero-p">{str.page_sub}</p>

        {/* Week hero */}
        <div className="week-hero" style={{ ["--week-label" as never]: `"${str.week_label}"` }}>
          <Rings totals={{ ...weekDisplayTotals, ...{} }} large={true} labelMap={labelMap}
            // Override pct: ring fill vs 7-day target = totals / (7 * RDI)
            // We pass a transformed totals so the dash formula matches: pctDash uses totals/RDI*1.
            // To represent vs 7x RDI, divide by 7 first.
          />
        </div>

        {/* 7 day cards */}
        {[0,1,2,3,4,5,6].map((d) => {
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
                  <span className="cal">{str.item_count(dayItems.length)} &middot; {Math.round(totals.cal)} cal</span>
                )}
              </div>

              <div className="day-rings">
                <Rings totals={totals} large={false} labelMap={labelMap} />
              </div>

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

      {/* Picker bottom sheet */}
      {openDay !== null && (
        <div className="picker-backdrop" onClick={closePicker}>
          <div className="picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-head">
              <span className="title">{str.picker_add_to} {str.days[openDay]}</span>
              <button type="button" className="close" onClick={closePicker} aria-label={str.picker_close}>&times;</button>
            </div>

            <div className="picker-tabs">
              <button className={pickerTab === "bowl" ? "on" : ""} onClick={() => setPickerTab("bowl")}>{str.picker_my_bowls}</button>
              <button className={pickerTab === "drink" ? "on" : ""} onClick={() => setPickerTab("drink")}>{str.picker_drinks}</button>
              <button className={pickerTab === "food" ? "on" : ""} onClick={() => setPickerTab("food")}>{str.picker_foods}</button>
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

              {(pickerTab === "drink" || pickerTab === "food") && (
                <div className="picker-list">
                  {addons.filter((a) => a.kind === pickerTab).map((a) => (
                    <button
                      key={a.id}
                      className="picker-option"
                      disabled={busy}
                      onClick={() => handleAdd({ dayIndex: openDay as 0|1|2|3|4|5|6, itemKind: pickerTab, addonId: a.id })}
                    >
                      <div className="ico" style={{ background: pickerTab === "drink" ? "#F68C02" : "#FFE9C2", color: pickerTab === "drink" ? "#fff" : "#7D291A" }}>
                        {pickerTab === "drink" ? "D" : "F"}
                      </div>
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
