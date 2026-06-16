/**
 * Typed analytics taxonomy for the /nutrition calculator (TSK-169).
 *
 * Thin wrapper over @vercel/analytics `track()`. Every event is auto-merged
 * with the first-touch marketing source (src + utm_*) from source.ts and the
 * active language, so downstream funnels in the Vercel Analytics "Events" tab
 * can segment by channel and locale without each call site repeating itself.
 *
 * The sink is injectable (`__setTrackSink`) so events.test.ts can assert the
 * exact payloads without a browser or the real Vercel client.
 */
import { track } from "@vercel/analytics";
import { getSource } from "./source";
import type { Lang } from "@/lib/lang";

/** Vercel allows only flat primitive property values. */
type AllowedValue = string | number | boolean | null;
export type EventProps = Record<string, AllowedValue>;

export type TrackSink = (name: string, props: EventProps) => void;

const defaultSink: TrackSink = (name, props) => {
  try {
    track(name, props);
  } catch {
    // Analytics unavailable (SSR, blocked, or not yet injected) — no-op.
  }
};

let sink: TrackSink = defaultSink;

/** Test hook — swap the analytics sink for a spy. */
export function __setTrackSink(fn: TrackSink): void {
  sink = fn;
}
/** Test hook — restore the real Vercel sink. */
export function __resetTrackSink(): void {
  sink = defaultSink;
}

/** Merge first-touch source + lang into every payload, then emit. */
function emit(name: string, lang: Lang, props: EventProps = {}): void {
  const source = getSource();
  sink(name, {
    src: source.src,
    utm_source: source.utm_source,
    utm_medium: source.utm_medium,
    utm_campaign: source.utm_campaign,
    lang,
    ...props,
  });
}

/** Where a Beacons "Order here" CTA was rendered/clicked. */
export type BeaconsTrigger = "3-ingredient" | "footer";
/** Auth state at the moment of a save-bowl interaction. */
export type SaveAuth = "logged_in" | "anonymous";

// ── Funnel: landing + locale ─────────────────────────────────────────────
export function trackCalcLanded(lang: Lang): void {
  emit("calc_landed", lang);
}
export function trackCalcLangToggled(lang: Lang, to: Lang): void {
  emit("calc_lang_toggled", lang, { to });
}

// ── Funnel: building a bowl ──────────────────────────────────────────────
export function trackCalcSignaturePicked(lang: Lang, signature: string): void {
  emit("calc_signature_picked", lang, { signature });
}
export function trackCalcByoStarted(lang: Lang): void {
  emit("calc_byo_started", lang);
}
export function trackCalcIngredientAdded(
  lang: Lang,
  p: { ingredient_id: string; ingredient: string; category: string; ingredient_count: number },
): void {
  emit("calc_ingredient_added", lang, { ...p });
}
export function trackCalcIngredientRemoved(
  lang: Lang,
  p: { ingredient_id: string; ingredient: string; category: string; ingredient_count: number },
): void {
  emit("calc_ingredient_removed", lang, { ...p });
}
export function trackCalcCompleted(
  lang: Lang,
  p: { ingredient_count: number; kcal: number },
): void {
  emit("calc_completed", lang, { ...p });
}

// ── Funnel: save / loyalty on-ramp ───────────────────────────────────────
export function trackCalcSaveBowlClicked(
  lang: Lang,
  p: { auth: SaveAuth; ingredient_count: number },
): void {
  emit("calc_save_bowl_clicked", lang, { ...p });
}
export function trackCalcOnrampShown(lang: Lang): void {
  emit("calc_onramp_shown", lang);
}
export function trackCalcOnrampClicked(lang: Lang): void {
  emit("calc_onramp_clicked", lang);
}
export function trackCalcBowlSaved(
  lang: Lang,
  p: { bowl_id: string; ingredient_count: number; phone_verified: boolean },
): void {
  emit("calc_bowl_saved", lang, { ...p });
}

// ── Funnel: Beacons acquisition loop ─────────────────────────────────────
export function trackCalcBeaconsCtaShown(lang: Lang, trigger: BeaconsTrigger): void {
  emit("calc_beacons_cta_shown", lang, { trigger });
}
export function trackCalcBeaconsCtaClicked(lang: Lang, trigger: BeaconsTrigger): void {
  emit("calc_beacons_cta_clicked", lang, { trigger });
}
