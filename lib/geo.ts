import { headers } from "next/headers";
import type { StoreCity } from "@/lib/types/database";

/**
 * Best-effort store suggestion from Vercel's edge geo headers (TSK-130).
 *
 * Vercel injects `x-vercel-ip-country-region` (ISO 3166-2 subdivision) and
 * `x-vercel-ip-city` on every request. For Vietnam the relevant subdivision
 * codes are VN-HN (Hà Nội) and VN-SG (Hồ Chí Minh / Saigon); the header carries
 * just the subdivision part ("HN" / "SG").
 *
 * This is a *hint only* — the city prompt highlights the suggested card but
 * still requires the customer to confirm. Returns null when we can't tell
 * (non-VN, missing headers, local dev).
 */
export function suggestStoreFromIp(): StoreCity | null {
  const h = headers();
  const country = (h.get("x-vercel-ip-country") ?? "").toUpperCase();
  // Only suggest inside Vietnam; elsewhere we have no basis to guess.
  if (country && country !== "VN") return null;

  const region = (h.get("x-vercel-ip-country-region") ?? "").toUpperCase();
  if (region === "HN") return "HN";
  if (region === "SG") return "HCM";

  // Fallback: match on city name (header is URL-encoded, e.g. "Hanoi").
  const city = decodeURIComponent(h.get("x-vercel-ip-city") ?? "").toLowerCase();
  if (city.includes("hanoi") || city.includes("ha noi")) return "HN";
  if (city.includes("ho chi minh") || city.includes("saigon") || city.includes("thu duc")) {
    return "HCM";
  }
  return null;
}
