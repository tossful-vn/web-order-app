"use client";

// Standalone copy table per the CityPromptModal pattern (Vietnamese up top,
// ASCII body below) — keeps the component self-contained. TSK-169.
const VI = {
  order: "Đặt món này",
  sub: "Đặt tô này trên Beacons",
};
const EN = {
  order: "Order here",
  sub: "Order this bowl on Beacons",
};

import { useEffect, useRef } from "react";
import type { Lang } from "@/lib/lang";
import {
  trackCalcBeaconsCtaShown,
  trackCalcBeaconsCtaClicked,
  type BeaconsTrigger,
} from "@/lib/analytics/events";

/** Acquisition loop — sends the visitor to beacons.ai/tossful to order. */
const BEACONS_URL = "https://beacons.ai/tossful";

type Props = {
  lang: Lang;
  /** Where this CTA sits — '3-ingredient' (inline) or 'footer' (static). */
  trigger: BeaconsTrigger;
  /** Visual variant: inline card under the macros ring, or shell footer card. */
  variant?: "inline" | "footer";
};

/**
 * Beacons "Order here" CTA (TSK-169). Fires `beacons_cta_shown` once when it
 * mounts (the inline variant only renders once 3+ ingredients are picked, so
 * mount === first impression) and `beacons_cta_clicked` on tap, both tagged
 * with the trigger. Opens Beacons in a new tab.
 */
export default function BeaconsCta({ lang, trigger, variant = "inline" }: Props) {
  const s = lang === "vi" ? VI : EN;
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    trackCalcBeaconsCtaShown(lang, trigger);
    // lang intentionally excluded from deps: we want a single impression per
    // mount, not a new "shown" event each time the language toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <a
      href={BEACONS_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackCalcBeaconsCtaClicked(lang, trigger)}
      className={
        "beacons-cta beacons-cta--" + variant + " " +
        "group flex items-center gap-3 rounded-2xl px-4 py-3.5 no-underline " +
        "bg-kale-700 text-cream shadow-sm transition-colors hover:bg-kale-800 active:scale-[0.99]"
      }
    >
      <span className="flex-1 min-w-0">
        <span className="block font-display text-lg leading-tight">{s.order}</span>
        <span className="block text-xs text-cream/75 leading-tight">{s.sub}</span>
      </span>
      <i className="ti ti-external-link text-xl shrink-0" aria-hidden="true" />
    </a>
  );
}
// trailing ASCII buffer
