"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { DayKey } from "@/lib/types/database";
import { PLAN_STR, type Lang } from "../i18n";
import type { DragData, DropData, ResolvedBowl } from "../types";

type Props = {
  lang: Lang;
  day: DayKey;
  dayLong: string; // "Thứ 2"
  dayEn: string; // "Mon"
  dateLabel: string; // "6/6"
  bowl: ResolvedBowl | null;
  selected: boolean; // this day is the active picker target
  /** A drag is in progress somewhere on the board (drives drop-zone hints). */
  dragActive: boolean;
  onSelect: () => void; // tap empty slot, or tap filled slot (opens options)
  onRemove: () => void; // quick-remove on a filled slot
};

function bowlName(b: ResolvedBowl, lang: Lang): string {
  return lang === "vi" && b.name_vn ? b.name_vn : b.name_en;
}

function initial(b: ResolvedBowl): string {
  return (b.name_en || "?").trim().charAt(0).toUpperCase();
}

/**
 * A day slot is both a drop target (always) and a drag source (only when
 * filled). Both halves register under the same id `slot:<day>` — @dnd-kit keeps
 * draggable/droppable in separate registries, so sharing the id is the standard
 * sortable pattern. The move/swap logic discriminates on `data.current.type`.
 *
 * Drag is initiated only from the grip handle beside the × remove button
 * (TSK-119 iOS fix): the handle carries the listeners + a11y attributes and is
 * the lone element with `touch-action: none`, so iOS Safari starts a drag from
 * it instead of swallowing the press-hold, while the rest of the slot scrolls.
 * The body keeps onClick for click-to-place, so tapping anywhere off the handle
 * opens the options/picker.
 */
export default function DaySlot({
  lang,
  day,
  dayLong,
  dayEn,
  dateLabel,
  bowl,
  selected,
  dragActive,
  onSelect,
  onRemove,
}: Props) {
  const str = PLAN_STR[lang];

  const dropData: DropData = { type: "slot", day };
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `slot:${day}`,
    data: dropData,
  });

  const dragData: DragData = { type: "slot", day, bowlId: bowl?.id ?? null };
  const {
    setNodeRef: setDragRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id: `slot:${day}`,
    data: dragData,
    disabled: !bowl,
  });

  const setRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  // Border / ring state. `isOver` wins (drop target highlight); an empty slot
  // pulses while any drag is active to read as "drop here".
  const stateClass = isOver
    ? bowl
      ? "border-kale-500 ring-2 ring-kale-500 bg-kale-50" // swap target
      : "border-kale-500 ring-2 ring-kale-500" // fill target
    : selected
      ? "border-kale-500 ring-2 ring-kale-200"
      : bowl
        ? "border-kale-100 active:bg-kale-50"
        : "border-dashed border-kale-300 active:bg-kale-50";

  const pulse = dragActive && !bowl && !isOver ? " plan-slot-pulse" : "";
  const dragging = isDragging ? " opacity-40" : "";

  return (
    <div
      ref={setRef}
      aria-label={bowl ? `${dayLong}: ${bowlName(bowl, lang)}` : `${dayLong}: ${str.empty_slot}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        // Filled slots are draggable: the keyboard sensor owns Space/Enter for
        // pick-up (via the grip's attributes). Empty slots aren't draggable, so
        // wire Enter/Space to open the picker (keyboard click-to-place fallback).
        if (!bowl && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={
        "plan-slot w-full text-left rounded-2xl border bg-white px-3 py-3 transition-colors cursor-pointer " +
        stateClass +
        pulse +
        dragging
      }
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-kale-700">
          {dayLong}{" "}
          <span className="text-kale-400 font-normal">
            ({dayEn}, {dateLabel})
          </span>
        </div>
      </div>

      {bowl ? (
        <div className="mt-2 flex items-center gap-3">
          {bowl.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bowl.photo}
              alt=""
              draggable={false}
              className="w-12 h-12 rounded-xl object-cover shrink-0 bg-kale-50"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-kale-700 text-cream flex items-center justify-center text-lg font-display italic shrink-0">
              {initial(bowl)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink truncate">{bowlName(bowl, lang)}</div>
            <div className="text-xs text-kale-500">
              {Math.round(bowl.kcal)} {str.cal} · {Math.round(bowl.protein_g)}g {str.macro_protein}
            </div>
          </div>
          {/* Drag handle — listeners live here so iOS keeps scroll (see plan.css). */}
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={str.drag_handle}
            onClick={(e) => e.stopPropagation()}
            className="plan-drag-handle w-8 h-8 rounded-full text-kale-400 flex items-center justify-center shrink-0 transition-opacity active:bg-kale-100 lg:opacity-50 lg:hover:opacity-100"
            {...listeners}
            {...attributes}
          >
            <i className="ti ti-grip-vertical text-base" />
          </button>
          <span
            role="button"
            tabIndex={-1}
            aria-label={str.slot_remove}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-full bg-kale-50 text-kale-500 flex items-center justify-center shrink-0 active:bg-kale-100"
          >
            <i className="ti ti-x text-base" />
          </span>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2 text-sm text-kale-400">
          <i className="ti ti-plus text-base" />
          <span>{selected ? str.slot_prompt : str.empty_slot}</span>
        </div>
      )}
    </div>
  );
}
