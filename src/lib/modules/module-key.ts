/** Tek kaynak: modül anahtarı normalizasyonu */
const MODULE_KEY_ALIASES: Record<string, string> = {
  POD: "POD_CREATOR",
  POD_CREATOR: "POD_CREATOR",
  PODCREATOR: "POD_CREATOR",
  POD_CREATOR_MODULE: "POD_CREATOR",
  LINKSLASH: "LINKSLASH",
  THYRONIX: "THYRONIX",
  HIVE: "HIVE",
  HIVE_PRO: "HIVE_PRO",
  AI_PAGE_FACTORY: "AI_PAGE_FACTORY",
  AI_DROPSHIP: "AI_DROPSHIP",
  ENA_COMMERCE: "ENA_COMMERCE",
};

/** DB'de eski/karışık kayıtlar için arama varyantları */
const MODULE_KEY_LOOKUP_VARIANTS: Record<string, string[]> = {
  POD_CREATOR: ["POD_CREATOR", "pod_creator", "Pod_Creator", "POD-CREATOR", "pod-creator", "POD"],
};

export function normalizeModuleKey(moduleKey: string): string {
  const compact = moduleKey.trim().toUpperCase().replace(/-/g, "_");
  return MODULE_KEY_ALIASES[compact] || compact;
}

export function moduleKeyLookupVariants(moduleKey: string): string[] {
  const normalized = normalizeModuleKey(moduleKey);
  const variants = MODULE_KEY_LOOKUP_VARIANTS[normalized];
  if (!variants) return [normalized];
  return [...new Set([normalized, ...variants])];
}
