// Shared types for the /plan planner (TSK-118). Plain module — no "use client"
// / "use server" — so both the server page and the client tree can import it.

import type { DayKey } from "@/lib/types/database";

export type SavedBowlMin = {
  id: string;
  name: string;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fibre_g: number | null;
  is_favourite?: boolean | null;
};

export type SignatureMin = {
  id: string;
  name_en: string;
  name_vn: string | null;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fibre_g: number;
};

/**
 * A slot value (saved_bowls.id OR signatures item id) resolved to everything
 * the UI needs to render it. `source` lets the slot show a photo for signatures
 * and an initial badge for custom saved bowls.
 */
export type ResolvedBowl = {
  id: string;
  source: "saved" | "signature";
  name_en: string;
  name_vn: string | null;
  /** "/nutrition/<file>.png" or null when there's no photo. */
  photo: string | null;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fibre_g: number;
};

// ── Drag-and-drop payloads (TSK-119) ────────────────────────────────────────
// Attached to draggables/droppables via @dnd-kit `data`. The drag handler reads
// `data.current` rather than parsing string ids, so id namespacing (e.g. one
// drawer instance per breakpoint) stays invisible to the move/swap logic.

/** What is being dragged. */
export type DragData =
  | { type: "drawerBowl"; bowlId: string }
  | { type: "slot"; day: DayKey; bowlId: string | null };

/** Where it can be dropped. */
export type DropData =
  | { type: "slot"; day: DayKey }
  | { type: "drawerZone" };
