"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ACCENT_META,
  ACCENTS,
  applyAppearanceToDocument,
  DEFAULT_APPEARANCE,
  isValidAccent,
  isValidTheme,
  THEME_META,
  THEMES,
  type AccentId,
  type AppearancePreferences,
  type ThemeId,
} from "./theme/tokens";

type ThemeContextValue = {
  theme: ThemeId;
  accent: AccentId;
  compactMode: boolean;
  reducedMotion: boolean;
  setTheme: (t: ThemeId) => void;
  setAccent: (a: AccentId) => void;
  setCompactMode: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  applyPreferences: (prefs: Partial<AppearancePreferences>) => Promise<void>;
  themes: ThemeId[];
  accents: AccentId[];
  labels: Record<ThemeId, string>;
  icons: Record<ThemeId, string>;
  accentLabels: Record<AccentId, string>;
  toggle: () => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  accent: "orange",
  compactMode: false,
  reducedMotion: false,
  setTheme: () => {},
  setAccent: () => {},
  setCompactMode: () => {},
  setReducedMotion: () => {},
  applyPreferences: async () => {},
  themes: [...THEMES],
  accents: [...ACCENTS],
  labels: Object.fromEntries(THEMES.map((t) => [t, THEME_META[t].label])) as Record<ThemeId, string>,
  icons: Object.fromEntries(THEMES.map((t) => [t, THEME_META[t].icon])) as Record<ThemeId, string>,
  accentLabels: Object.fromEntries(ACCENTS.map((a) => [a, ACCENT_META[a].label])) as Record<AccentId, string>,
  toggle: () => {},
  ready: false,
});

function readLocalAppearance(): AppearancePreferences {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = localStorage.getItem("ena-appearance");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: isValidTheme(parsed.theme) ? parsed.theme : DEFAULT_APPEARANCE.theme,
        accent: isValidAccent(parsed.accent) ? parsed.accent : DEFAULT_APPEARANCE.accent,
        compactMode: !!parsed.compactMode,
        reducedMotion: !!parsed.reducedMotion,
      };
    }
    const legacyTheme = localStorage.getItem("theme");
    if (legacyTheme && isValidTheme(legacyTheme)) {
      return { ...DEFAULT_APPEARANCE, theme: legacyTheme };
    }
  } catch {}
  return DEFAULT_APPEARANCE;
}

function persistLocal(prefs: AppearancePreferences) {
  localStorage.setItem("ena-appearance", JSON.stringify(prefs));
  localStorage.setItem("theme", prefs.theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppearancePreferences>(DEFAULT_APPEARANCE);
  const [ready, setReady] = useState(false);

  const syncDocument = useCallback((p: AppearancePreferences) => {
    applyAppearanceToDocument(p);
    persistLocal(p);
  }, []);

  useEffect(() => {
    const local = readLocalAppearance();
    setPrefs(local);
    syncDocument(local);
    setReady(true);

    fetch("/api/user/appearance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success && d.data) {
          const merged: AppearancePreferences = {
            theme: isValidTheme(d.data.theme) ? d.data.theme : local.theme,
            accent: isValidAccent(d.data.accent) ? d.data.accent : local.accent,
            compactMode: d.data.compactMode ?? local.compactMode,
            reducedMotion: d.data.reducedMotion ?? local.reducedMotion,
          };
          setPrefs(merged);
          syncDocument(merged);
        }
      })
      .catch(() => {});
  }, [syncDocument]);

  const savePrefs = useCallback(
    async (next: AppearancePreferences) => {
      setPrefs(next);
      syncDocument(next);
      try {
        await fetch("/api/user/appearance", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
      } catch {}
    },
    [syncDocument]
  );

  const applyPreferences = useCallback(
    async (partial: Partial<AppearancePreferences>) => {
      const next = { ...prefs, ...partial };
      await savePrefs(next);
    },
    [prefs, savePrefs]
  );

  const setTheme = useCallback((t: ThemeId) => applyPreferences({ theme: t }), [applyPreferences]);
  const setAccent = useCallback((a: AccentId) => applyPreferences({ accent: a }), [applyPreferences]);
  const setCompactMode = useCallback((v: boolean) => applyPreferences({ compactMode: v }), [applyPreferences]);
  const setReducedMotion = useCallback((v: boolean) => applyPreferences({ reducedMotion: v }), [applyPreferences]);

  const toggle = () => {
    const idx = THEMES.indexOf(prefs.theme);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  const labels = Object.fromEntries(THEMES.map((t) => [t, THEME_META[t].label])) as Record<ThemeId, string>;
  const icons = Object.fromEntries(THEMES.map((t) => [t, THEME_META[t].icon])) as Record<ThemeId, string>;
  const accentLabels = Object.fromEntries(ACCENTS.map((a) => [a, ACCENT_META[a].label])) as Record<AccentId, string>;

  return (
    <ThemeContext.Provider
      value={{
        theme: prefs.theme,
        accent: prefs.accent,
        compactMode: prefs.compactMode,
        reducedMotion: prefs.reducedMotion,
        setTheme,
        setAccent,
        setCompactMode,
        setReducedMotion,
        applyPreferences,
        themes: [...THEMES],
        accents: [...ACCENTS],
        labels,
        icons,
        accentLabels,
        toggle,
        ready,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
