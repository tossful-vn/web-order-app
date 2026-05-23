import type { Metadata } from "next";
import Calculator from "./Calculator.client";
import "./styles.css";

export const metadata: Metadata = {
  title: "Tossful — Nutrition calculator",
  description: "Build your bowl and see live nutrition. A bowl for everyone.",
};

export default function NutritionPage() {
  return <Calculator />;
}
