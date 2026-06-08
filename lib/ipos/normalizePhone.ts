/**
 * iPOS phone → canonical Tossful phone key (TSK-148).
 *
 * iPOS exports phones 84-prefixed ("84936336649"); the web-account identity
 * stored in `profiles.phone` is the VN local format "0XXXXXXXXX" (enforced by
 * the `profiles_phone_check` constraint `^0[0-9]{9}$` and produced by the
 * signup/login normaliser in `lib/auth/phone.ts`).
 *
 * This helper converts the iPOS form to that SAME canonical key so an iPOS
 * order and a web account for the same person collide on one string. We reuse
 * `isValidVnPhone` (the exact predicate signup uses) as the final gate, so the
 * two pipelines can never drift into different key spaces.
 */
import { isValidVnPhone, normalizePhone } from "@/lib/auth/phone";

/** GrabFood / online hub placeholder ids — not real customers (README finding). */
const PLACEHOLDER_PREFIX = "84100";

/** VN mobile second segment after the country code: 3/5/7/8/9 are real mobiles. */
const VN_MOBILE_LEADERS = new Set(["3", "5", "7", "8", "9"]);

/**
 * Normalise a raw iPOS phone string to the canonical "0XXXXXXXXX" key, or
 * return `null` when the value is not an attributable customer mobile.
 *
 * Rules (from the dataset README):
 *  - strip every non-digit,
 *  - "84" + 9 digits whose first ∈ {3,5,7,8,9} → "0" + those 9 digits,
 *  - already "0XXXXXXXXX" → keep as-is,
 *  - exclude the GrabFood placeholder "8410000232" / any "84100…",
 *  - exclude blanks and anything shorter than a full VN mobile.
 */
export function normalizeIposPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  // GrabFood / online hub placeholder — drop before any other interpretation.
  if (digits.startsWith(PLACEHOLDER_PREFIX)) return null;

  let candidate: string | null = null;

  if (digits.length === 11 && digits.startsWith("84") && VN_MOBILE_LEADERS.has(digits[2])) {
    // 84936336649 → 0936336649
    candidate = "0" + digits.slice(2);
  } else if (digits.length === 10 && digits.startsWith("0")) {
    // Already in VN local form.
    candidate = digits;
  } else {
    return null;
  }

  // Final gate: must satisfy the very predicate signup/login uses, so iPOS keys
  // and web-account keys are guaranteed to live in the same space.
  return isValidVnPhone(normalizePhone(candidate)) ? candidate : null;
}
