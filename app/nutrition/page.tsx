import type { Metadata } from "next";
import Calculator from "./Calculator.client";
import { createClient } from "@/lib/supabase/server";
import { suggestStoreFromIp } from "@/lib/geo";
import type { StoreCity } from "@/lib/types/database";
import "./styles.css";

const OG_TITLE = "Tossful — Nutrition calculator";
const OG_DESCRIPTION =
  "Build your bowl and see live nutrition. A bowl for everyone.";
const OG_IMAGE = "/og/calc-kale_my_ex.png";

export const metadata: Metadata = {
  // Absolute base so the og/twitter image unfurls on Facebook / Zalo (TSK-169).
  metadataBase: new URL("https://my.tossful.com"),
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: "/nutrition",
    siteName: "Tossful",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Tossful nutrition calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default async function NutritionPage() {
  // City-based pricing (TSK-130): prices only show for a logged-in customer
  // who has chosen a store. Resolve auth + preferred_store server-side and pass
  // them as the calculator's initial state; the IP suggestion just pre-highlights
  // a card in the lazy prompt.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialCity: StoreCity | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_store")
      .eq("id", user.id)
      .maybeSingle();
    const ps = profile?.preferred_store;
    initialCity = ps === "HN" || ps === "HCM" ? ps : null;
  }

  return (
    <Calculator
      isLoggedIn={!!user}
      initialCity={initialCity}
      suggestedCity={suggestStoreFromIp()}
    />
  );
}
