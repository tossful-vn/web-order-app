"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "vi";
const STORAGE_KEY = "tossful_lang";
const EVENT_NAME = "tossful:lang-changed";

export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "vi" ? "vi" : "en";
}

export function persistLang(lang: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, lang);
  // Also persist as a cookie so Server Components can read it.
  document.cookie = STORAGE_KEY + "=" + lang + "; path=/; max-age=31536000; SameSite=Lax";
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent<Lang>(EVENT_NAME, { detail: lang }));
}

/**
 * Cross-component language state — backed by localStorage and broadcast via
 * a custom window event. The drawer's EN/VI toggle calls persistLang() and
 * every consumer (calculator, account, etc.) re-renders with the new lang.
 */
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(getStoredLang());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Lang>).detail;
      if (detail === "en" || detail === "vi") setLangState(detail);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  return [lang, persistLang];
}
