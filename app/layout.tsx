import type { Metadata } from "next";
import { Fraunces, Questrial, Lora } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext", "vietnamese"],
  // Load BOTH normal and italic font files. Without italic, Fraunces upright
  // is synthesized into italic by the browser — synthesis breaks composed
  // Vietnamese diacritics (e.g. "Biết" renders as "Biê´t").
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const questrial = Questrial({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: "400",
  variable: "--font-questrial",
  display: "swap",
});

// Lora — serif with proper precomposed Vietnamese glyphs. Used in place of
// Fraunces when displaying menu item names that may contain ế/ề/etc, because
// Fraunces (both italic and normal) renders those as ê+floating-accent.
const lora = Lora({
  subsets: ["latin", "latin-ext", "vietnamese"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tossful — Salad đặt online",
  description: "Đặt salad Tossful giao tận nơi hoặc nhận tại cửa hàng.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${fraunces.variable} ${questrial.variable} ${lora.variable}`}>
      <body className="font-body bg-cream text-ink antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
