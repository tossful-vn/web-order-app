import type { Metadata } from "next";
import { Fraunces, Questrial } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const questrial = Questrial({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-questrial",
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
    <html lang="vi" className={`${fraunces.variable} ${questrial.variable}`}>
      <body className="font-body bg-cream text-ink antialiased">{children}</body>
    </html>
  );
}
