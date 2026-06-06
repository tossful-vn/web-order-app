// Week-math helpers for the /plan planner (TSK-118). Pure date utilities —
// safe to import from both Server Components and Client Components (no
// "use server", no DOM). All weeks are keyed by the Monday ISO date.
import type { DayKey } from "@/lib/types/database";

/** Mon–Fri, in order. Matches BywSlots keys (the planner is a weekday planner). */
export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];

// Parse "YYYY-MM-DD" as a LOCAL date at noon. Noon avoids any DST / timezone
// off-by-one when we later read getDate(). The app is single-region (VN).
function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO date of the Monday on or before `d`. */
export function mondayOf(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  const dow = copy.getDay(); // 0 = Sun … 6 = Sat
  const sinceMonday = (dow + 6) % 7; // Mon→0, Sun→6
  copy.setDate(copy.getDate() - sinceMonday);
  return toIso(copy);
}

/** ISO Monday of the current week. */
export function currentMonday(): string {
  return mondayOf(new Date());
}

/**
 * Coerce an arbitrary `?week=` value to a valid Monday ISO. Any date snaps to
 * its Monday; anything unparseable falls back to the current week.
 */
export function normalizeWeek(raw: string | undefined | null): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = parseIso(raw);
    if (!Number.isNaN(d.getTime())) return mondayOf(d);
  }
  return currentMonday();
}

/** Add (or subtract) whole weeks to a Monday ISO. */
export function addWeeks(mondayIso: string, n: number): string {
  const d = parseIso(mondayIso);
  d.setDate(d.getDate() + n * 7);
  return toIso(d);
}

/** Date of a given weekday offset (0 = Mon) within the week. */
export function dayDate(mondayIso: string, dayIndex: number): Date {
  const d = parseIso(mondayIso);
  d.setDate(d.getDate() + dayIndex);
  return d;
}

/** "6/6" style d/m for a weekday card header. */
export function dayShort(mondayIso: string, dayIndex: number): string {
  const d = dayDate(mondayIso, dayIndex);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** "6/6 – 12/6/2026" — Mon→Sun inclusive (the customer thinks in calendar weeks). */
export function weekRangeLabel(mondayIso: string): string {
  const start = parseIso(mondayIso);
  const end = parseIso(addWeeks(mondayIso, 0));
  end.setDate(end.getDate() + 6);
  return `${start.getDate()}/${start.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
}

/** Whether `mondayIso` is this week's Monday. */
export function isCurrentWeek(mondayIso: string): boolean {
  return mondayIso === currentMonday();
}
