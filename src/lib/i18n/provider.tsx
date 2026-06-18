"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import tr from "./dictionaries/tr";
import en from "./dictionaries/en";
import de from "./dictionaries/de";
import ar from "./dictionaries/ar";

export type Locale = "tr" | "en" | "de" | "ar";
export type Dict = typeof tr;

const dictionaries: Record<Locale, Dict> = { tr, en, de, ar };
const LOCALE_LABELS: Record<Locale, string> = { tr: "🇹🇷 Türkçe", en: "🇬🇧 English", de: "🇩🇪 Deutsch", ar: "🇸🇦 العربية" };
const RTL_LOCALES: Locale[] = ["ar"];

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  locales: Record<Locale, string>;
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: "tr", setLocale: () => {}, t: (k: string) => k, locales: LOCALE_LABELS, isRtl: false,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");
  const [ready, setReady] = useState(false);

  // Read cookie after mount (avoids SSR hydration issues)
  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
      if (match?.[1] && dictionaries[match[1] as Locale]) {
        setLocaleState(match[1] as Locale);
      }
    } catch {}
    setReady(true);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try { document.cookie = `locale=${l};path=/;max-age=31536000;samesite=lax`; } catch {}
  };

  const t = (key: string): string => {
    const dict = dictionaries[locale] as any;
    const parts = key.split(".");
    let result: any = dict;
    for (const part of parts) {
      if (result && typeof result === "object") result = result[part];
      else return key;
    }
    return typeof result === "string" ? result : key;
  };

  const isRtl = RTL_LOCALES.includes(locale);

  useEffect(() => {
    if (ready) {
      document.documentElement.dir = isRtl ? "rtl" : "ltr";
      document.documentElement.lang = locale;
    }
  }, [locale, isRtl, ready]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales: LOCALE_LABELS, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  return { t: ctx.t, locale: ctx.locale, setLocale: ctx.setLocale, isRtl: ctx.isRtl };
}

export { dictionaries, LOCALE_LABELS };
