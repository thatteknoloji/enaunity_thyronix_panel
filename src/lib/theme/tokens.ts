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

export function isValidTheme(v: string): v is ThemeId {
  return (THEMES as readonly string[]).includes(v);
}

export function isValidAccent(v: string): v is AccentId {
  return (ACCENTS as readonly string[]).includes(v);
}

export function applyAppearanceToDocument(prefs: AppearancePreferences) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", prefs.theme);
  document.documentElement.setAttribute("data-accent", prefs.accent);
  document.documentElement.classList.toggle("acc-compact", prefs.compactMode);
  document.documentElement.classList.toggle("acc-reduced-motion", prefs.reducedMotion);
}
