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

  return (
    <div className="byw-page">
      <div className="byw-app">
        <h1 className="byw-hero-h1">{str.page_title}</h1>
        <p className="byw-hero-p">{str.page_sub}</p>

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
                    <>
                      {(() => {
                        const favs = savedBowls.filter((b) => b.is_favourite === true);
                        const rest = savedBowls.filter((b) => b.is_favourite !== true);
                        const renderBowl = (b: BowlMin) => (
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
                        );
                        return (
                          <>
                            {favs.length > 0 && (
                              <>
                                <div className="picker-subheading">{str.must_try}</div>
                                {favs.map(renderBowl)}
                              </>
                            )}
                            {rest.length > 0 && (
                              <>
                                {favs.length > 0 && <div className="picker-subheading">{str.picker_saved_bowls}</div>}
                                {rest.map(renderBowl)}
                              </>
                            )}
                          </>
                        );
                      })()}
                    </>
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
                  {(() => {
                    // Split signatures by wrap suffix; group with addons.
                    const isWrapName = (n: string) => /\s*-\s*Wrap\s*$/i.test(n);
                    const displayName = (n: string) => {
                      const m = n.match(/^(.+?)\s*-\s*Wrap\s*$/i);
                      return m ? `WRAP | ${m[1].trim()}` : n;
                    };
                    const sigBowls = signatures.filter((sg) => !isWrapName(sg.name_en));
                    const sigWraps = signatures.filter((sg) => isWrapName(sg.name_en));
                    const addonWraps = addons.filter((a) => a.kind === "wrap");
                    const sides = addons.filter((a) => a.kind === "side");

                    const renderSig = (sg: Signature) => (
                      <button
                        key={`sig-${sg.id}`}
                        className="picker-option"
                        disabled={busy}
                        onClick={() => handleAdd({
                          dayIndex: openDay as 0|1|2|3|4|5|6,
                          itemKind: "custom",
                          customName: (lang === "vi" && sg.name_vn) ? sg.name_vn : displayName(sg.name_en),
                          customKcal: sg.kcal,
                          customProteinG: sg.protein_g,
                          customFatG: sg.fat_g,
                          customCarbsG: sg.carbs_g,
                          customFibreG: sg.fibre_g,
                        })}
                      >
                        <div className="ico" style={{ background: "#C0DD97", color: "#0F563D" }}>B</div>
                        <div className="body">
                          <div className="name">{(lang === "vi" && sg.name_vn) ? sg.name_vn : displayName(sg.name_en)}</div>
                          <div className="macros">{sg.kcal} cal &middot; {sg.protein_g.toFixed(0)}g protein</div>
                        </div>
                      </button>
                    );
                    const renderAddon = (a: AddonMin, label: string, bg: string, fg: string) => (
                      <button
                        key={`${a.kind}-${a.id}`}
                        className="picker-option"
                        disabled={busy}
                        onClick={() => handleAdd({ dayIndex: openDay as 0|1|2|3|4|5|6, itemKind: a.kind, addonId: a.id })}
                      >
                        <div className="ico" style={{ background: bg, color: fg }}>{label}</div>
                        <div className="body">
                          <div className="name">{(lang === "vi" && a.name_vn) ? a.name_vn : a.name_en}</div>
                          <div className="macros">{Math.round(Number(a.kcal ?? 0))} cal &middot; {Number(a.protein_g ?? 0).toFixed(0)}g protein</div>
                        </div>
                      </button>
                    );

                    return (
                      <>
                        {sigBowls.length > 0 && (
                          <>
                            <div className="picker-subheading">{str.picker_sub_bowls}</div>
                            {sigBowls.map(renderSig)}
                          </>
                        )}
                        {(sigWraps.length > 0 || addonWraps.length > 0) && (
                          <>
                            <div className="picker-subheading">{str.picker_sub_wraps}</div>
                            {sigWraps.map(renderSig)}
                            {addonWraps.map((a) => renderAddon(a, "W", "#FFE9C2", "#7D291A"))}
                          </>
                        )}
                        {sides.length > 0 && (
                          <>
                            <div className="picker-subheading">{str.picker_sub_sides}</div>
                            {sides.map((a) => renderAddon(a, "S", "#F8E3F3", "#7D291A"))}
                          </>
                        )}
                      </>
                    );
                  })()}
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
