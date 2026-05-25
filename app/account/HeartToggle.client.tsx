"use client";

import { useState, useTransition } from "react";
import { toggleFavouriteById } from "@/lib/bowls/actions";

type Props = {
  id: string;
  initialIsFavourite: boolean;
  addLabel: string;
  removeLabel: string;
};

/**
 * Optimistic heart toggle: flips the icon instantly on click, then runs the
 * server action inside a transition. On server error we revert the visual
 * state. On success the server's revalidatePath re-renders /account with the
 * fresh row; we sync local state to the server-confirmed value.
 *
 * Why this matters: server action round-trip is ~300-500ms. Without the
 * optimistic flip the heart feels laggy and users double-click.
 */
export default function HeartToggle({
  id,
  initialIsFavourite,
  addLabel,
  removeLabel,
}: Props) {
  const [isFav, setIsFav] = useState(initialIsFavourite);
  const [isPending, startTransition] = useTransition();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;
    const previous = isFav;
    const next = !previous;
    // Flip UI immediately.
    setIsFav(next);
    startTransition(() => {
      toggleFavouriteById(id).then((res) => {
        if ("ok" in res) {
          setIsFav(res.isFavourite);
        } else {
          // Revert on server error.
          setIsFav(previous);
          console.error("toggleFavouriteById failed:", res.error);
        }
      });
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label={isFav ? removeLabel : addLabel}
      aria-pressed={isFav}
      title={isFav ? removeLabel : addLabel}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-kale-100 hover:bg-kale-50 hover:border-kale-300 transition disabled:opacity-70"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill={isFav ? "#F68C02" : "none"}
        stroke={isFav ? "#F68C02" : "#3a5634"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
