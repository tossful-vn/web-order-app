/**
 * Phone-identity helpers shared by the Hybrid v2 auth flows (TSK-127).
 *
 * The customer-visible identity is a Vietnamese mobile number (10 digits,
 * starts with 0). Supabase auth is backed by a SYNTHETIC email derived from
 * the phone — see syntheticEmail() below.
 */

/** Vietnamese mobile format: 10 digits starting with 0 (e.g. 0901234567). */
const VN_PHONE_RE = /^0\d{9}$/;

/** Strip spaces/dashes and surrounding whitespace so "090 123 4567" validates. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, "").trim();
}

export function isValidVnPhone(raw: string): boolean {
  return VN_PHONE_RE.test(normalizePhone(raw));
}

/**
 * Map a phone number to the Supabase auth email that backs the account.
 *
 * The `.local` TLD is intentional: it is reserved (RFC 6762) and never routes
 * mail, so these addresses can never receive a confirmation email nor collide
 * with a real customer inbox. Phone stays canonical in profiles.phone; this
 * synthetic address exists only so we can lean on Supabase's email+password
 * auth without a custom provider. Example: 0901234567 -> 0901234567@phone.tossful.local
 */
export function syntheticEmail(phone: string): string {
  return `${normalizePhone(phone)}@phone.tossful.local`;
}
