"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ACCENT_META,
  ACCENTS,
  applyAppearanceToDocument,
  appearancesEqual,
  DEFAULT_APPEARANCE,
  hasStoredAppearance,
  isValidAccent,
  isValidTheme,
  persistStoredAppearance,
  readStoredAppearance,
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

function normalizeAppearance(raw: Partial<AppearancePreferences> | null | undefined, fallback: AppearancePreferences): AppearancePreferences {
  return {
    theme: raw?.theme && isValidTheme(raw.theme) ? raw.theme : fallback.theme,
    accent: raw?.accent && isValidAccent(raw.accent) ? raw.accent : fallback.accent,
    compactMode: raw?.compactMode ?? fallback.compactMode,
    reducedMotion: raw?.reducedMotion ?? fallback.reducedMotion,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppearancePreferences>(DEFAULT_APPEARANCE);
  const [ready, setReady] = useState(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const syncDocument = useCallback((p: AppearancePreferences) => {
    applyAppearanceToDocument(p);
    persistStoredAppearance(p);
  }, []);

  const pushToServer = useCallback(async (next: AppearancePreferences) => {
    try {
      await fetch("/api/user/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {}
  }, []);

  useEffect(() => {
    const local = readStoredAppearance();
    setPrefs(local);
    syncDocument(local);
    setReady(true);

    fetch("/api/user/appearance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.success || !d.data) return;

        const server = normalizeAppearance(d.data, DEFAULT_APPEARANCE);
        const stored = readStoredAppearance();

        // Local/device choice wins when user already picked a theme on this device.
        // Server is used only for first visit or when local storage is empty.
        if (hasStoredAppearance()) {
          if (!appearancesEqual(stored, server)) {
            void pushToServer(stored);
          }
          return;
        }

        setPrefs(server);
        syncDocument(server);
      })
      .catch(() => {});
  }, [syncDocument, pushToServer]);

  const savePrefs = useCallback(
    async (next: AppearancePreferences) => {
      setPrefs(next);
      syncDocument(next);
      await pushToServer(next);
    },
    [syncDocument, pushToServer]
  );

  const applyPreferences = useCallback(
    async (partial: Partial<AppearancePreferences>) => {
      const next = { ...prefsRef.current, ...partial };
      await savePrefs(next);
    },
    [savePrefs]
  );

  const setTheme = useCallback((t: ThemeId) => applyPreferences({ theme: t }), [applyPreferences]);
  const setAccent = useCallback((a: AccentId) => applyPreferences({ accent: a }), [applyPreferences]);
  const setCompactMode = useCallback((v: boolean) => applyPreferences({ compactMode: v }), [applyPreferences]);
  const setReducedMotion = useCallback((v: boolean) => applyPreferences({ reducedMotion: v }), [applyPreferences]);

  const toggle = () => {
    const idx = THEMES.indexOf(prefsRef.current.theme);
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
