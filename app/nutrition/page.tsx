import type { Metadata } from "next";
import Calculator from "./Calculator.client";
import "./styles.css";

export const metadata: Metadata = {
  title: "Tossful — Nutrition calculator",
  description:
    "Build your bowl and see live nutrition. A bowl for everyone.",
};

export default function NutritionPage() {
  return (
    <>
      {/* Tabler Icons webfont — used by the calculator's chip icons + UI affordances */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.21.0/dist/tabler-icons.min.css"
      />
      <Calculator />
    </>
  );
}
