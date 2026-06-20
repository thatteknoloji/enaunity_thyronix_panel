"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  loadAppearanceFromServer,
  persistScopedAppearance,
  readScopedAppearance,
  saveAppearanceToServer,
} from "./theme/appearance-storage";
import {
  ACCENT_META,
  ACCENTS,
  applyAppearanceToDocument,
  DEFAULT_APPEARANCE,
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
  userId: string | null;
  setTheme: (t: ThemeId) => void;
  setAccent: (a: AccentId) => void;
  setCompactMode: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  applyPreferences: (prefs: Partial<AppearancePreferences>, options?: { syncServer?: boolean }) => Promise<void>;
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
  userId: null,
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

function syncForUser(userId: string | null, prefs: AppearancePreferences) {
  applyAppearanceToDocument(prefs);
  persistScopedAppearance(userId, prefs);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [prefs, setPrefs] = useState<AppearancePreferences>(DEFAULT_APPEARANCE);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const prefsRef = useRef(prefs);
  const userIdRef = useRef<string | null>(null);
  prefsRef.current = prefs;
  userIdRef.current = userId;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const id: string | null = d?.data?.id ?? null;
        setUserId(id);
        const local = readScopedAppearance(id);
        setPrefs(local);
        syncForUser(id, local);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        const local = readScopedAppearance(null);
        setPrefs(local);
        syncForUser(null, local);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const savePrefs = useCallback(async (next: AppearancePreferences, syncServer = false) => {
    const uid = userIdRef.current;
    setPrefs(next);
    syncForUser(uid, next);
    if (syncServer && uid) {
      await saveAppearanceToServer(next);
    }
  }, []);

  const applyPreferences = useCallback(
    async (partial: Partial<AppearancePreferences>, options?: { syncServer?: boolean }) => {
      const next = { ...prefsRef.current, ...partial };
      await savePrefs(next, options?.syncServer ?? false);
    },
    [savePrefs]
  );

  const setTheme = useCallback((t: ThemeId) => applyPreferences({ theme: t }), [applyPreferences]);
  const setAccent = useCallback((a: AccentId) => applyPreferences({ accent: a }), [applyPreferences]);
  const setCompactMode = useCallback((v: boolean) => applyPreferences({ compactMode: v }), [applyPreferences]);
  const setReducedMotion = useCallback(
    (v: boolean) => applyPreferences({ reducedMotion: v }),
    [applyPreferences]
  );

  const toggle = () => {
    const idx = THEMES.indexOf(prefsRef.current.theme);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  const labels = Object.fromEntries(THEMES.map((t) => [t, THEME_META[t].label])) as Record<ThemeId, string>;
  const icons = Object.fromEntries(THEMES.map((t) => [t, THEME_META[t].icon])) as Record<ThemeId, string>;
  const accentLabels = Object.fromEntries(ACCENTS.map((a) => [a, ACCENT_META[a].label])) as Record<
    AccentId,
    string
  >;

  return (
    <ThemeContext.Provider
      value={{
        theme: prefs.theme,
        accent: prefs.accent,
        compactMode: prefs.compactMode,
        reducedMotion: prefs.reducedMotion,
        userId,
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

/** Load saved account appearance into local scope (account settings page only). */
export async function restoreAppearanceFromAccount(userId: string | null): Promise<AppearancePreferences | null> {
  if (!userId) return null;
  const server = await loadAppearanceFromServer();
  if (!server) return null;
  syncForUser(userId, server);
  return server;
}
