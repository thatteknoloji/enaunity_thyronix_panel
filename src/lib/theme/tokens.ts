export const THEMES = [
  "dark",
  "light",
  "sunset",
  "forest",
  "aurora-glass",
  "midnight-neon",
  "executive-white",
  "obsidian-gold",
] as const;

export type ThemeId = (typeof THEMES)[number];

export const ACCENTS = ["red", "blue", "purple", "emerald", "orange"] as const;
export type AccentId = (typeof ACCENTS)[number];

export const THEME_META: Record<ThemeId, { label: string; description: string; icon: string }> = {
  dark: { label: "Dark Pro", description: "Klasik koyu bayi paneli", icon: "🌙" },
  light: { label: "Light Pro", description: "Aydınlık kurumsal görünüm", icon: "☀️" },
  sunset: { label: "Theme 3 · Sunset", description: "Sıcak koyu tonlar", icon: "🌅" },
  forest: { label: "Theme 4 · Forest", description: "Doğal yeşil koyu", icon: "🌲" },
  "aurora-glass": { label: "Aurora Glass", description: "OpenAI · Vercel · Linear", icon: "✨" },
  "midnight-neon": { label: "Midnight Neon", description: "Bloomberg · Tesla · Cyber Ops", icon: "⚡" },
  "executive-white": { label: "Executive White", description: "Apple Business · Stripe · Notion", icon: "📋" },
  "obsidian-gold": { label: "Obsidian Gold", description: "Private Banking · Enterprise ERP", icon: "🏛️" },
};

export const ACCENT_META: Record<AccentId, { label: string; swatch: string }> = {
  red: { label: "Red", swatch: "#e50914" },
  blue: { label: "Blue", swatch: "#3b82f6" },
  purple: { label: "Purple", swatch: "#8b5cf6" },
  emerald: { label: "Emerald", swatch: "#10b981" },
  orange: { label: "Orange", swatch: "#f27a1a" },
};

export type AppearancePreferences = {
  theme: ThemeId;
  accent: AccentId;
  compactMode: boolean;
  reducedMotion: boolean;
};

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "dark",
  accent: "orange",
  compactMode: false,
  reducedMotion: false,
};

/** Themes with light browser chrome / scrollbars */
export const LIGHT_THEMES = new Set<ThemeId>(["light", "executive-white"]);

export const THEME_BROWSER_COLORS: Record<ThemeId, string> = {
  dark: "#141414",
  light: "#ffffff",
  sunset: "#1a1410",
  forest: "#0a1612",
  "aurora-glass": "#0b0f19",
  "midnight-neon": "#050810",
  "executive-white": "#f6f7f9",
  "obsidian-gold": "#0c0a09",
};

export function isValidTheme(v: string): v is ThemeId {
  return (THEMES as readonly string[]).includes(v);
}

export function isValidAccent(v: string): v is AccentId {
  return (ACCENTS as readonly string[]).includes(v);
}

export function readStoredAppearance(): AppearancePreferences {
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

export function persistStoredAppearance(prefs: AppearancePreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("ena-appearance", JSON.stringify(prefs));
    localStorage.setItem("theme", prefs.theme);
  } catch {}
}

export function hasStoredAppearance(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem("ena-appearance") || !!localStorage.getItem("theme");
  } catch {
    return false;
  }
}

function updateThemeColorMeta(theme: ThemeId) {
  const color = THEME_BROWSER_COLORS[theme] || THEME_BROWSER_COLORS.dark;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export function applyAppearanceToDocument(prefs: AppearancePreferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", prefs.theme);
  root.setAttribute("data-accent", prefs.accent);
  root.classList.toggle("acc-compact", prefs.compactMode);
  root.classList.toggle("acc-reduced-motion", prefs.reducedMotion);
  root.style.colorScheme = LIGHT_THEMES.has(prefs.theme) ? "light" : "dark";
  updateThemeColorMeta(prefs.theme);
}

export function appearancesEqual(a: AppearancePreferences, b: AppearancePreferences): boolean {
  return (
    a.theme === b.theme &&
    a.accent === b.accent &&
    a.compactMode === b.compactMode &&
    a.reducedMotion === b.reducedMotion
  );
}
