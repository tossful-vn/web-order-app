/**
 * Marketing-source attribution for the /nutrition calculator (TSK-169).
 *
 * /nutrition is linked from beacons.ai/tossful and other channels with a
 * tracking query, e.g.
 *   /nutrition?src=beacons&utm_source=beacons&utm_medium=link&utm_campaign=launch_2026q2
 *
 * On first mount we snapshot src + the three utm params into sessionStorage so
 * EVERY analytics event fired later in the session carries the same attribution
 * (first-touch). Pure + dependency-injected so it unit-tests without a DOM.
 */

export type CalcSource = {
  /** Short channel tag (?src=…). Defaults to "direct" when absent. */
  src: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

/** sessionStorage key the first-touch source is persisted under. */
export const CALC_SOURCE_KEY = "tossful.calc.source";

const DEFAULT_SRC = "direct";

const EMPTY: CalcSource = {
  src: DEFAULT_SRC,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
};

/** Minimal storage surface so tests can pass a plain in-memory object. */
type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Parse a location.search string into a CalcSource. Pure — no storage. */
export function parseSource(search: string): CalcSource {
  const params = new URLSearchParams(search ?? "");
  const get = (k: string): string | null => {
    const v = params.get(k);
    return v && v.trim() !== "" ? v.trim() : null;
  };
  return {
    src: get("src") ?? DEFAULT_SRC,
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
  };
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    // sessionStorage disabled (private mode / blocked) — degrade gracefully.
    return null;
  }
}

function read(store: StorageLike): CalcSource | null {
  const raw = store.getItem(CALC_SOURCE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CalcSource>;
    return {
      src: typeof parsed.src === "string" ? parsed.src : DEFAULT_SRC,
      utm_source: parsed.utm_source ?? null,
      utm_medium: parsed.utm_medium ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Capture attribution on first mount. First-touch wins: if a source is already
 * stored this session it is returned unchanged (a later navigation without utm
 * params never clobbers the original beacons attribution). Returns the source
 * either way.
 */
export function captureSource(search: string, storage?: StorageLike): CalcSource {
  const store = resolveStorage(storage);
  if (!store) return parseSource(search);

  const existing = read(store);
  if (existing) return existing;

  const parsed = parseSource(search);
  try {
    store.setItem(CALC_SOURCE_KEY, JSON.stringify(parsed));
  } catch {
    // Write failed (quota / disabled) — non-fatal; events fall back to default.
  }
  return parsed;
}

/** Read the persisted first-touch source, or a "direct" default if none. */
export function getSource(storage?: StorageLike): CalcSource {
  const store = resolveStorage(storage);
  if (!store) return { ...EMPTY };
  return read(store) ?? { ...EMPTY };
}
