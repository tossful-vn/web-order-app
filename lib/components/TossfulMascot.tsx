/**
 * Tossful mascot — the bowl character from the Brand Pass
 * (public/brand/tossful-mascot.png). Shared by Lá (launcher + panel avatar,
 * TSK-175) and the loyalty stamp-card centre (TSK-176) so the brand face stays
 * byte-identical across every surface.
 *
 * The PNG is a solid dark-green silhouette on transparent, so it only reads on
 * a light backdrop — callers place it inside a cream/white circle. The full
 * character is ~square, shown object-contain with a small inset so it never
 * clips inside a round container. Decorative only (aria-hidden); the meaning is
 * carried by the surrounding control's own label.
 */
export default function TossfulMascot({ className }: { className?: string }) {
  return (
    <img
      src="/brand/tossful-mascot.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={"object-contain select-none pointer-events-none " + (className ?? "")}
    />
  );
}
