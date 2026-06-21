export type HeroTitleSegment = {
  text: string;
  color: string;
};

export const DEFAULT_TITLE_SEGMENTS: HeroTitleSegment[] = [
  { text: "ENA", color: "#e50914" },
  { text: "UNITY", color: "#ffffff" },
];

export const HERO_FONT_OPTIONS = [
  { value: "geist-black", label: "Geist Black (varsayılan)" },
  { value: "geist-sans", label: "Geist Sans" },
  { value: "geist-mono", label: "Geist Mono" },
  { value: "system", label: "System UI" },
] as const;

export const HERO_TITLE_SIZE_OPTIONS = [
  { value: "sm", label: "Küçük", className: "text-3xl sm:text-4xl md:text-5xl" },
  { value: "md", label: "Orta", className: "text-4xl sm:text-5xl md:text-6xl" },
  { value: "lg", label: "Büyük", className: "text-4xl sm:text-5xl md:text-7xl" },
  { value: "xl", label: "Ekstra Büyük", className: "text-5xl sm:text-6xl md:text-8xl" },
] as const;

export const HERO_HEIGHT_OPTIONS = [
  { value: "md", label: "Orta (70vh)", className: "min-h-[60vh] sm:min-h-[550px] h-[70vh] sm:h-[75vh]" },
  { value: "lg", label: "Büyük (85vh)", className: "min-h-[70vh] sm:min-h-[650px] h-[85vh] sm:h-[90vh]" },
  { value: "xl", label: "Tam ekran", className: "min-h-screen h-screen" },
  { value: "full", label: "100vh+", className: "min-h-[100dvh] h-[100dvh]" },
] as const;

export const HERO_ALIGN_OPTIONS = [
  { value: "left", label: "Sol" },
  { value: "center", label: "Orta" },
] as const;

export function titleFromSegments(segments: HeroTitleSegment[]): string {
  return segments.map((s) => s.text).join("");
}

export function parseTitleSegments(json: string, fallbackTitle = ""): HeroTitleSegment[] {
  try {
    const parsed = JSON.parse(json) as HeroTitleSegment[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter((s) => s && String(s.text || "").length > 0)
        .map((s) => ({ text: String(s.text), color: String(s.color || "#ffffff") }));
    }
  } catch {
    /* fall through */
  }
  const title = fallbackTitle.trim();
  if (title.toUpperCase().startsWith("ENA") && title.length > 3) {
    return [
      { text: title.slice(0, 3), color: "#e50914" },
      { text: title.slice(3), color: "#ffffff" },
    ];
  }
  if (title) return [{ text: title, color: "#ffffff" }];
  return DEFAULT_TITLE_SEGMENTS.map((s) => ({ ...s }));
}

export function serializeTitleSegments(segments: HeroTitleSegment[]): string {
  return JSON.stringify(segments.filter((s) => s.text.trim()));
}

export function getHeroFontClass(font: string, kind: "title" | "body" = "title"): string {
  if (font === "geist-mono") return "font-mono";
  if (font === "geist-sans" || kind === "body") return "font-sans";
  if (font === "system") return "font-sans";
  return "font-black tracking-tight";
}

export function getHeroTitleSizeClass(size: string): string {
  return HERO_TITLE_SIZE_OPTIONS.find((o) => o.value === size)?.className ?? HERO_TITLE_SIZE_OPTIONS[3].className;
}

export function getHeroHeightClass(height: string): string {
  return HERO_HEIGHT_OPTIONS.find((o) => o.value === height)?.className ?? HERO_HEIGHT_OPTIONS[1].className;
}
