import { cookies } from "next/headers";

export type Lang = "en" | "vi";
const STORAGE_KEY = "tossful_lang";

/**
 * Read the current language preference from cookies in a Server Component.
 * The companion useLang hook in lib/lang.ts writes this cookie when the
 * drawer's EN/VI toggle changes. Defaults to Vietnamese — Tossful's primary
 * customer base.
 */
export function getServerLang(): Lang {
  const c = cookies().get(STORAGE_KEY)?.value;
  return c === "en" ? "en" : "vi";
}
