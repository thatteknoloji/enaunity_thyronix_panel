import {
  DEFAULT_APPEARANCE,
  isValidAccent,
  isValidTheme,
  type AppearancePreferences,
} from "./tokens";

const SCOPED_STORE_KEY = "ena-appearance-v2";
/** Flat cache for pre-paint blocking script (current session only) */
export const APPEARANCE_CACHE_KEY = "ena-appearance";

export type AppearanceScope = string;

export function appearanceScope(userId: string | null | undefined): AppearanceScope {
  return userId ? `user:${userId}` : "guest";
}

function normalizePartial(raw: Partial<AppearancePreferences>): AppearancePreferences {
  return {
    theme: raw.theme && isValidTheme(raw.theme) ? raw.theme : DEFAULT_APPEARANCE.theme,
    accent: raw.accent && isValidAccent(raw.accent) ? raw.accent : DEFAULT_APPEARANCE.accent,
    compactMode: !!raw.compactMode,
    reducedMotion: !!raw.reducedMotion,
  };
}

function readScopedStore(): Record<AppearanceScope, AppearancePreferences> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SCOPED_STORE_KEY);
    if (raw) return JSON.parse(raw) as Record<AppearanceScope, AppearancePreferences>;
  } catch {}
  return {};
}

function readLegacyGlobal(): AppearancePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(APPEARANCE_CACHE_KEY);
    if (raw) return normalizePartial(JSON.parse(raw));
    const legacyTheme = localStorage.getItem("theme");
    if (legacyTheme && isValidTheme(legacyTheme)) {
      return { ...DEFAULT_APPEARANCE, theme: legacyTheme };
    }
  } catch {}
  return null;
}

/** Read appearance for a specific user session (guest or logged-in). */
export function readScopedAppearance(userId: string | null | undefined): AppearancePreferences {
  const scope = appearanceScope(userId);
  const store = readScopedStore();
  if (store[scope]) return normalizePartial(store[scope]);

  // One-time migration: old global key becomes guest-only preference
  if (scope === "guest") {
    const legacy = readLegacyGlobal();
    if (legacy) {
      persistScopedAppearance(null, legacy);
      return legacy;
    }
  }

  return DEFAULT_APPEARANCE;
}

/** Persist appearance for the active user/guest — never overwrites other scopes. */
export function persistScopedAppearance(
  userId: string | null | undefined,
  prefs: AppearancePreferences
) {
  if (typeof window === "undefined") return;
  const scope = appearanceScope(userId);
  const normalized = normalizePartial(prefs);
  try {
    const store = readScopedStore();
    store[scope] = normalized;
    localStorage.setItem(SCOPED_STORE_KEY, JSON.stringify(store));
    // Blocking script reads this flat cache (current viewer only)
    localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(normalized));
    localStorage.setItem("theme", normalized.theme);
  } catch {}
}

export async function saveAppearanceToServer(prefs: AppearancePreferences): Promise<boolean> {
  try {
    const res = await fetch("/api/user/appearance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadAppearanceFromServer(): Promise<AppearancePreferences | null> {
  try {
    const res = await fetch("/api/user/appearance", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data.data) return null;
    return normalizePartial(data.data);
  } catch {
    return null;
  }
}
