"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useLang } from "@/lib/lang";
import { upsertPlan } from "@/lib/byw";
import type { BywSlots, DayKey } from "@/lib/types/database";
import type { DragData, DropData } from "./types";
import { lookupSignaturePhoto } from "@/app/nutrition/photo-maps";
import {
  DAY_KEYS,
  addWeeks,
  dayShort,
  isCurrentWeek,
  weekRangeLabel,
} from "@/lib/byw-week";
import { resolveTemplateSlots, type PlanTemplate } from "@/lib/byw-templates";
import { PLAN_STR } from "./i18n";
import type { ResolvedBowl, SavedBowlMin, SignatureMin } from "./types";
import WeekSelector from "./components/WeekSelector.client";
import MacrosSummary from "./components/MacrosSummary.client";
import DaySlot from "./components/DaySlot.client";
import SavedBowlsDrawer from "./components/SavedBowlsDrawer.client";
import EmptyState from "./components/EmptyState.client";

type Props = {
  weekStart: string; // Monday ISO
  displayName: string | null;
  initialSlots: BywSlots;
  prevWeekSlots: BywSlots | null;
  savedBowls: SavedBowlMin[];
  signatures: SignatureMin[];
};

const num = (v: number | null | undefined): number => Number(v ?? 0);

export default function PlanClient({
  weekStart,
  displayName,
  initialSlots,
  prevWeekSlots,
  savedBowls,
  signatures,
}: Props) {
  const [lang] = useLang();
  const str = PLAN_STR[lang];

  const [slots, setSlots] = useState<BywSlots>(initialSlots);
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);
  const [detailDay, setDetailDay] = useState<DayKey | null>(null);
  const [toast, setToast] = useState<"saving" | "saved" | null>(null);
  const [continued, setContinued] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [, startSave] = useTransition();

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── DnD sensors (TSK-119) ──────────────────────────────────────────────────
  // Drag is initiated only from a grip handle (see DaySlot / DrawerCard), which
  // is the lone element carrying `touch-action: none`. That confines the gesture
  // capture to the grip — iOS Safari no longer swallows the press-hold before the
  // TouchSensor can claim it, while the rest of the page/drawer keeps scrolling.
  // TouchSensor's short delay still guards against an accidental drag if a finger
  // lands on the grip mid-scroll; mouse drags activate after 8px.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // ── Resolve slot ids (saved_bowls.id OR signature id) to renderable bowls ──
  const bowlById = useMemo(() => {
    const m = new Map<string, ResolvedBowl>();
    for (const b of savedBowls) {
      const file = lookupSignaturePhoto(b.name);
      m.set(b.id, {
        id: b.id,
        source: "saved",
        name_en: b.name,
        name_vn: null,
        photo: file ? `/nutrition/${file}` : null,
        kcal: num(b.kcal),
        protein_g: num(b.protein_g),
        fat_g: num(b.fat_g),
        carbs_g: num(b.carbs_g),
        fibre_g: num(b.fibre_g),
      });
    }
    for (const s of signatures) {
      const file = lookupSignaturePhoto(s.name_en);
      m.set(s.id, {
        id: s.id,
        source: "signature",
        name_en: s.name_en,
        name_vn: s.name_vn,
        photo: file ? `/nutrition/${file}` : null,
        kcal: s.kcal,
        protein_g: s.protein_g,
        fat_g: s.fat_g,
        carbs_g: s.carbs_g,
        fibre_g: s.fibre_g,
      });
    }
    return m;
  }, [savedBowls, signatures]);

  const resolveSlot = (day: DayKey): ResolvedBowl | null => {
    const id = slots[day];
    return id ? bowlById.get(id) ?? null : null;
  };

  const resolved = DAY_KEYS.map((d) => resolveSlot(d));
  const filled = resolved.filter((b): b is ResolvedBowl => b !== null);
  const filledCount = filled.length;
  const isEmpty = filledCount === 0;

  const avg = filledCount
    ? {
        cal: filled.reduce((a, b) => a + b.kcal, 0) / filledCount,
        protein: filled.reduce((a, b) => a + b.protein_g, 0) / filledCount,
        fat: filled.reduce((a, b) => a + b.fat_g, 0) / filledCount,
        carbs: filled.reduce((a, b) => a + b.carbs_g, 0) / filledCount,
      }
    : { cal: 0, protein: 0, fat: 0, carbs: 0 };

  const drawerBowls = useMemo(
    () =>
      savedBowls
        .map((b) => bowlById.get(b.id))
        .filter((b): b is ResolvedBowl => b !== undefined),
    [savedBowls, bowlById]
  );

  // Prior week available to copy forward?
  const prevFilledCount = prevWeekSlots
    ? DAY_KEYS.filter((d) => {
        const id = prevWeekSlots[d];
        return id ? bowlById.has(id) : false;
      }).length
    : 0;
  const showContinue = isEmpty && !continued && prevFilledCount > 0;

  // ── Persistence (debounced autosave + immediate saves) ────────────────────
  function persist(next: BywSlots) {
    setToast("saving");
    startSave(async () => {
      try {
        await upsertPlan(weekStart, next);
        setToast("saved");
        if (hide.current) clearTimeout(hide.current);
        hide.current = setTimeout(() => setToast(null), 1600);
      } catch {
        setToast(null);
      }
    });
  }
  function scheduleSave(next: BywSlots) {
    setToast("saving");
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => persist(next), 800);
  }
  function saveNow(next: BywSlots) {
    if (debounce.current) clearTimeout(debounce.current);
    persist(next);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  function assign(day: DayKey, bowlId: string | null, immediate = false) {
    const next: BywSlots = { ...slots, [day]: bowlId };
    setSlots(next);
    if (immediate) saveNow(next);
    else scheduleSave(next);
  }

  // Move/swap a bowl between two day slots in one update. Empty target → move;
  // filled target → swap the two bowls.
  function moveOrSwap(from: DayKey, to: DayKey) {
    if (from === to) return;
    const next: BywSlots = {
      ...slots,
      [from]: slots[to] ?? null,
      [to]: slots[from] ?? null,
    };
    setSlots(next);
    scheduleSave(next);
  }

  // ── DnD event handlers ─────────────────────────────────────────────────────
  function handleDragStart(e: DragStartEvent) {
    setActiveDrag((e.active.data.current as DragData | undefined) ?? null);
  }

  function handleDragCancel() {
    setActiveDrag(null); // released outside any droppable → restore (no save)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDrag(null);
    const src = e.active.data.current as DragData | undefined;
    const dst = e.over?.data.current as DropData | undefined;
    if (!src || !dst) return; // dropped outside any droppable → no change

    if (src.type === "drawerBowl") {
      // Drawer bowl → slot: assign (replaces whatever was there). Dropping back
      // on the drawer is a no-op.
      if (dst.type === "slot") assign(dst.day, src.bowlId);
      return;
    }

    // src.type === "slot"
    if (dst.type === "drawerZone") {
      assign(src.day, null); // slot bowl → drawer: remove from the day
    } else if (dst.type === "slot") {
      moveOrSwap(src.day, dst.day);
    }
  }

  const dragActive = activeDrag !== null;
  const slotDragActive = activeDrag?.type === "slot";
  const overlayBowl =
    activeDrag && activeDrag.bowlId ? bowlById.get(activeDrag.bowlId) ?? null : null;

  function handleSlotClick(day: DayKey) {
    if (resolveSlot(day)) {
      setDetailDay(day); // filled → open options
    } else {
      setSelectedDay((prev) => (prev === day ? null : day)); // empty → arm picker
    }
  }

  function handlePick(bowlId: string) {
    const target = selectedDay ?? DAY_KEYS.find((d) => !resolveSlot(d)) ?? null;
    if (!target) return;
    assign(target, bowlId);
    setSelectedDay(null);
  }

  function applyTemplate(t: PlanTemplate) {
    const next = resolveTemplateSlots(t, signatures);
    setSlots(next);
    setSelectedDay(null);
    setContinued(true);
    saveNow(next);
  }

  function continueLastWeek() {
    if (!prevWeekSlots) return;
    const next: BywSlots = { ...prevWeekSlots };
    setSlots(next);
    setContinued(true);
    saveNow(next);
  }

  const selectedDayLabel =
    selectedDay !== null ? str.days_long[DAY_KEYS.indexOf(selectedDay)] : null;
  const detailBowl = detailDay !== null ? resolveSlot(detailDay) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="max-w-5xl mx-auto px-3 pt-4 pb-6">
      <WeekSelector
        lang={lang}
        title={str.title(displayName)}
        rangeLabel={weekRangeLabel(weekStart)}
        isCurrent={isCurrentWeek(weekStart)}
        prevHref={`/plan?week=${addWeeks(weekStart, -1)}`}
        nextHref={`/plan?week=${addWeeks(weekStart, 1)}`}
        thisHref="/plan"
      />

      {filledCount > 0 && (
        <div className="sticky top-14 z-20 mt-3">
          <MacrosSummary lang={lang} avg={avg} />
        </div>
      )}

      {showContinue && (
        <div className="mt-4 rounded-2xl border border-kale-200 bg-kale-50 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-kale-700">{str.continue_q}</span>
          <button
            type="button"
            onClick={continueLastWeek}
            className="shrink-0 rounded-full bg-kale-700 text-cream text-xs font-medium px-3 py-1.5 active:bg-kale-800"
          >
            {str.continue_do}
          </button>
        </div>
      )}

      <div className="mt-4 lg:grid lg:grid-cols-[260px_1fr] lg:gap-4 lg:items-start">
        {/* Desktop: saved bowls as a left side panel */}
        <div className="hidden lg:block lg:sticky lg:top-14">
          <SavedBowlsDrawer
            lang={lang}
            bowls={drawerBowls}
            selectedDayLabel={selectedDayLabel}
            onPick={handlePick}
            idScope="desktop"
            slotDragActive={slotDragActive}
          />
        </div>

        <div>
          {isEmpty && (
            <div className="mb-4">
              <EmptyState
                lang={lang}
                hasSavedBowls={savedBowls.length > 0}
                onApply={applyTemplate}
              />
            </div>
          )}

          <div className="grid gap-2 lg:grid-cols-5">
            {DAY_KEYS.map((day, i) => (
              <DaySlot
                key={day}
                lang={lang}
                day={day}
                dayLong={str.days_long[i]}
                dayEn={str.days_en[i]}
                dateLabel={dayShort(weekStart, i)}
                bowl={resolveSlot(day)}
                selected={selectedDay === day}
                dragActive={dragActive}
                onSelect={() => handleSlotClick(day)}
                onRemove={() => assign(day, null)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: saved bowls as a sticky bottom drawer */}
      <div className="lg:hidden sticky bottom-0 z-20 -mx-3 mt-4 px-3 pt-2 pb-3 bg-cream/95 backdrop-blur border-t border-kale-100">
        <SavedBowlsDrawer
          lang={lang}
          bowls={drawerBowls}
          selectedDayLabel={selectedDayLabel}
          onPick={handlePick}
          idScope="mobile"
          slotDragActive={slotDragActive}
        />
      </div>

      {/* Save toast */}
      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 z-40 rounded-full bg-kale-800 text-cream text-xs px-4 py-2 shadow-lg"
          role="status"
        >
          {toast === "saving" ? str.saving : str.saved}
        </div>
      )}

      {/* Slot options modal (Remove / Replace) */}
      {detailDay !== null && detailBowl && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setDetailDay(null)}
        >
          <div className="absolute inset-0" style={{ background: "rgba(15,86,61,0.4)" }} />
          <div
            className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-kale-700">{str.slot_options}</h3>
              <button
                type="button"
                aria-label={str.close}
                onClick={() => setDetailDay(null)}
                className="w-8 h-8 rounded-full bg-kale-50 text-kale-700 flex items-center justify-center"
              >
                <i className="ti ti-x text-lg" />
              </button>
            </div>
            <div className="mt-2 text-sm text-ink font-medium">
              {lang === "vi" && detailBowl.name_vn ? detailBowl.name_vn : detailBowl.name_en}
            </div>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  const day = detailDay;
                  setDetailDay(null);
                  setSelectedDay(day);
                }}
                className="w-full rounded-full bg-kale-700 text-cream text-sm font-medium py-2.5 active:bg-kale-800"
              >
                {str.slot_replace}
              </button>
              <button
                type="button"
                onClick={() => {
                  assign(detailDay, null);
                  setDetailDay(null);
                }}
                className="w-full rounded-full bg-kale-50 text-sm font-medium py-2.5 active:bg-kale-100"
                style={{ color: "#7D291A" }}
              >
                {str.slot_remove}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Drag ghost — follows the pointer/finger while dragging */}
      <DragOverlay dropAnimation={null}>
        {overlayBowl ? (
          <div className="flex items-center gap-2 rounded-2xl border border-kale-300 bg-white px-3 py-2 shadow-xl opacity-90 pointer-events-none">
            {overlayBowl.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={overlayBowl.photo}
                alt=""
                draggable={false}
                className="w-10 h-10 rounded-lg object-cover bg-kale-50 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-kale-700 text-cream flex items-center justify-center text-base font-display italic shrink-0">
                {(overlayBowl.name_en || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-ink truncate max-w-[40vw]">
              {lang === "vi" && overlayBowl.name_vn ? overlayBowl.name_vn : overlayBowl.name_en}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
