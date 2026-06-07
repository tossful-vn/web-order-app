"use client";

import Link from "next/link";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { PLAN_STR, type Lang } from "../i18n";
import type { DragData, DropData, ResolvedBowl } from "../types";

type Props = {
  lang: Lang;
  bowls: ResolvedBowl[];
  /** Localized label of the day currently being filled, or null. */
  selectedDayLabel: string | null;
  onPick: (bowlId: string) => void;
  /**
   * Both the desktop and mobile drawers mount at once (one hidden per
   * breakpoint), so each needs a distinct id namespace — duplicate @dnd-kit ids
   * break the registry. The drag payload still carries the real bowl id.
   */
  idScope: "desktop" | "mobile";
  /** True while a filled slot is being dragged → drawer reads as "drop to remove". */
  slotDragActive: boolean;
};

function bowlName(b: ResolvedBowl, lang: Lang): string {
  return lang === "vi" && b.name_vn ? b.name_vn : b.name_en;
}

function initial(b: ResolvedBowl): string {
  return (b.name_en || "?").trim().charAt(0).toUpperCase();
}

/** A single saved-bowl card — a drag source for filling a slot. */
function DrawerCard({
  bowl,
  lang,
  idScope,
  onPick,
}: {
  bowl: ResolvedBowl;
  lang: Lang;
  idScope: Props["idScope"];
  onPick: (bowlId: string) => void;
}) {
  const data: DragData = { type: "drawerBowl", bowlId: bowl.id };
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } =
    useDraggable({
      id: `drawer:${idScope}:${bowl.id}`,
      data,
    });

  return (
    <div
      ref={setNodeRef}
      aria-label={bowlName(bowl, lang)}
      onClick={() => onPick(bowl.id)}
      className={
        "plan-draggable relative shrink-0 w-24 lg:w-full lg:flex lg:items-center lg:gap-2 rounded-xl border border-kale-100 bg-cream p-2 text-left cursor-pointer active:bg-kale-50" +
        (isDragging ? " opacity-40" : "")
      }
    >
      {/* Drag handle — listeners live here so iOS keeps scroll (see plan.css). */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={PLAN_STR[lang].drag_handle}
        onClick={(e) => e.stopPropagation()}
        {...listeners}
        {...attributes}
        className="plan-drag-handle absolute right-1 top-1 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/80 text-kale-400 shadow-sm transition-opacity lg:static lg:order-last lg:bg-transparent lg:opacity-50 lg:shadow-none lg:hover:opacity-100"
      >
        <i className="ti ti-grip-vertical text-sm" />
      </button>
      {bowl.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bowl.photo}
          alt=""
          draggable={false}
          className="w-full lg:w-10 h-16 lg:h-10 rounded-lg object-cover bg-kale-50 shrink-0"
        />
      ) : (
        <div className="w-full lg:w-10 h-16 lg:h-10 rounded-lg bg-kale-700 text-cream flex items-center justify-center text-lg font-display italic shrink-0">
          {initial(bowl)}
        </div>
      )}
      <div className="mt-1 lg:mt-0 min-w-0 lg:flex-1">
        <div className="text-[11px] font-medium text-ink truncate">{bowlName(bowl, lang)}</div>
        <div className="text-[10px] text-kale-500 truncate">
          {Math.round(bowl.kcal)} · {Math.round(bowl.protein_g)}g {PLAN_STR[lang].macro_protein}
        </div>
      </div>
    </div>
  );
}

/**
 * Saved-bowls panel. Mobile: a sticky bottom strip with a horizontal scroll row.
 * Desktop: the parent grid places it as a left column (vertical wrap). When a
 * slot is selected the header turns into a picker prompt.
 *
 * The whole panel is also a drop zone: dragging a filled slot's bowl here
 * removes it from the day (the bowl always remains in the saved list).
 */
export default function SavedBowlsDrawer({
  lang,
  bowls,
  selectedDayLabel,
  onPick,
  idScope,
  slotDragActive,
}: Props) {
  const str = PLAN_STR[lang];

  const dropData: DropData = { type: "drawerZone" };
  const { setNodeRef, isOver } = useDroppable({
    id: `drawer-zone:${idScope}`,
    data: dropData,
  });

  const removeArmed = slotDragActive && isOver;

  return (
    <section
      ref={setNodeRef}
      className={
        "rounded-2xl border bg-white px-3 py-3 transition-colors " +
        (removeArmed
          ? "border-kale-500 ring-2 ring-kale-500 bg-kale-50"
          : slotDragActive
            ? "border-dashed border-kale-300"
            : "border-kale-100")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-kale-700">{str.drawer_title}</h2>
        <span className="text-[11px] text-kale-500 truncate">
          {slotDragActive
            ? str.drawer_remove_hint
            : selectedDayLabel
              ? str.pick_for(selectedDayLabel)
              : str.drawer_idle}
        </span>
      </div>

      {bowls.length === 0 ? (
        <div className="mt-2 text-xs text-kale-500">
          <p>{str.no_saved}</p>
          <Link
            href="/nutrition"
            prefetch
            className="inline-flex items-center gap-1 mt-2 text-kale-700 font-medium underline underline-offset-2"
          >
            <i className="ti ti-calculator text-sm" />
            {str.open_calc}
          </Link>
        </div>
      ) : (
        <div className="mt-2 flex gap-2 overflow-x-auto plan-noscroll lg:flex-wrap lg:overflow-visible">
          {bowls.map((b) => (
            <DrawerCard key={b.id} bowl={b} lang={lang} idScope={idScope} onPick={onPick} />
          ))}
        </div>
      )}
    </section>
  );
}
