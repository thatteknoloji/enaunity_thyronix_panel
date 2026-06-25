import type { BrainInput } from "./ai-brain-types";

const BASE_ENTITIES = [
  "kullanıcı ihtiyacı",
  "maliyet",
  "kalite",
  "karşılaştırma",
  "tedarik",
  "uygulama",
  "destek",
];

export function extractEntitiesFromInput(input: BrainInput): string[] {
  const topic = `${input.keyword || ""} ${input.keywordGroup || ""} ${input.product || ""} ${input.category || ""} ${input.oldSlug || ""}`
    .toLowerCase()
    .replace(/[-_/]/g, " ");
  const raw = topic.split(/\s+/).filter((x) => x.length > 2);
  const merged = [...raw, ...BASE_ENTITIES];
  return Array.from(new Set(merged)).slice(0, 24);
}
