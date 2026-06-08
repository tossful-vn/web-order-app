"use client";

import Link from "next/link";
import { Draggable, Droppable } from "./dnd";
import type { BYW_STR } from "./i18n";

type Str = (typeof BYW_STR)[keyof typeof BYW_STR];

type BowlMin = {
  id: string;
  name: string;
  kcal: number | null;
  protein_g: number | null;
  is_favourite?: boolean | null;
};

type Props = {
  str: Str;
  bowls: BowlMin[];
  /** True while a day item is being dragged → drawer reads as "drop to remove". */
  dayItemDragActive: boolean;
  /** Localized label of the armed day, or null. */
  armedDayLabel: string | null;
  /** Click-to-place fallback: tap a card to add the bowl to the armed/first-empty day. */
  onPick: (bowlId: string) => void;
};

function initial(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase();
}

/**
 * Saved-bowls drawer (sticky bottom strip). Each card is a drag source that
 * adds the bowl to a day; the whole strip is also a drop zone that removes a
 * dragged day item. Mirrors PR #9's SavedBowlsDrawer but for /byw's row model.
 */
export default function BywDrawer({ str, bowls, dayItemDragActive, armedDayLabel, onPick }: Props) {
  return (
    <Droppable id="byw-drawer-zone" data={{ type: "drawerZone" }}>
      {({ setNodeRef, isOver }) => {
        const removeArmed = dayItemDragActive && isOver;
        return (
          <section
            ref={setNodeRef}
            className={
              "byw-drawer" +
              (removeArmed ? " remove-armed" : dayItemDragActive ? " remove-hint" : "")
            }
          >
            <div className="byw-drawer-head">
              <span className="title">{str.drawer_title}</span>
              <span className="hint">
                {dayItemDragActive
                  ? str.drawer_remove_hint
                  : armedDayLabel
                    ? str.pick_for(armedDayLabel)
                    : str.drawer_idle}
              </span>
            </div>

            {bowls.length === 0 ? (
              <div className="byw-drawer-empty">
                <span>{str.drawer_no_saved}</span>
                <Link href="/nutrition" prefetch>
                  <i className="ti ti-calculator" /> {str.picker_open_calc}
                </Link>
              </div>
            ) : (
              <div className="byw-drawer-row">
                {bowls.map((b) => (
                  <Draggable
                    key={b.id}
                    id={`byw-drawer:${b.id}`}
                    data={{ type: "drawerBowl", bowlId: b.id }}
                  >
                    {({ setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging }) => (
                      <div
                        ref={setNodeRef}
                        className={"byw-drawer-card" + (isDragging ? " dragging" : "")}
                        onClick={() => onPick(b.id)}
                      >
                        <button
                          ref={setActivatorNodeRef}
                          type="button"
                          aria-label={str.drag_handle}
                          className="byw-drag-handle drawer"
                          onClick={(e) => e.stopPropagation()}
                          {...(listeners ?? {})}
                          {...attributes}
                        >
                          <i className="ti ti-grip-vertical" />
                        </button>
                        <div className="thumb">{initial(b.name)}</div>
                        <div className="meta">
                          <div className="name">{b.name}</div>
                          <div className="macros">
                            {Math.round(Number(b.kcal ?? 0))} · {Number(b.protein_g ?? 0).toFixed(0)}g{" "}
                            {str.banner_protein}
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
              </div>
            )}
          </section>
        );
      }}
    </Droppable>
  );
}
