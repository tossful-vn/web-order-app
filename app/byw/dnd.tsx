"use client";

// DnD helpers for the /byw planner (TSK-141), backported from closed PR #9
// (tsk-119/dnd-plan @ fafc7f0). The /byw data model is multi-item rows in
// `week_items` (not /plan's one-bowl-per-day slots), so the payloads here carry
// a week_item id + day index rather than a single slot key.
//
// Both helpers are thin render-prop wrappers around @dnd-kit hooks so the day
// grid in Planner.client.tsx stays readable: hooks must run in their own
// component (can't be called inside a .map), and a render prop keeps the markup
// inline instead of prop-drilling refs/listeners through extra components.

import { useDraggable, useDroppable, type DraggableAttributes } from "@dnd-kit/core";

/** What is being dragged. */
export type DragData =
  | { type: "drawerBowl"; bowlId: string }
  | { type: "dayItem"; itemId: string; dayIndex: number; kind: string; name: string; cal: number };

/** Where it can be dropped. */
export type DropData =
  | { type: "day"; dayIndex: number }
  | { type: "drawerZone" };

export function Droppable({
  id,
  data,
  children,
}: {
  id: string;
  data: DropData;
  children: (args: { setNodeRef: (el: HTMLElement | null) => void; isOver: boolean }) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data });
  return <>{children({ setNodeRef, isOver })}</>;
}

export function Draggable({
  id,
  data,
  disabled,
  children,
}: {
  id: string;
  data: DragData;
  disabled?: boolean;
  children: (args: {
    setNodeRef: (el: HTMLElement | null) => void;
    setActivatorNodeRef: (el: HTMLElement | null) => void;
    listeners: Record<string, unknown> | undefined;
    attributes: DraggableAttributes;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } = useDraggable({
    id,
    data,
    disabled,
  });
  return <>{children({ setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging })}</>;
}
