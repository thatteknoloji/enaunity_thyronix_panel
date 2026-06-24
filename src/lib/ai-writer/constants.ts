export const WRITER_VERSION = "ENA_AKILLI_ICERIK_YAZARI_V1" as const;

export const BANNED_PHRASES = [
  "seo, geo ve aeo perspektifinden ele alıyoruz",
  "içerik tamamen özgün üretilmiştir",
  "rakip metinlerden kopyalama yapılmaz",
  "daha fazla bilgi için iletişime geçin",
  "daha fazla bilgi için bize ulaşın",
  "bu rehberde konuyu seo",
] as const;

export const MIN_WORD_COUNTS = {
  BLOG: 900,
  PAGE: 700,
  GEO: 700,
  RECOVERY: 700,
} as const;

export const AI_PAGE_KINDS = new Set([
  "PRODUCT_DETAIL",
  "PRODUCT_FAQ",
  "PRODUCT_GEO",
  "PRODUCT_CATEGORY",
  "PRODUCT_INTENT",
  "PRODUCT_GUIDE",
  "PRODUCT_BENEFIT",
  "PRODUCT_PROBLEM",
  "GUIDE",
  "BENEFIT",
  "PROBLEM",
]);

export const DEFAULT_MODELS: Record<string, string> = {
  OPENAI: "gpt-4o-mini",
  GEMINI: "gemini-1.5-flash",
  ANTHROPIC: "claude-3-haiku-20240307",
  OPENROUTER: "openai/gpt-4o-mini",
  OLLAMA: "llama3",
};
