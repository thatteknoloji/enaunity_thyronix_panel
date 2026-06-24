export type ThyronixSourceMetadataInput = {
  sourceType: string;
  templateId?: string;
  sourceUrl?: string;
  sourceId?: string;
  raw: unknown;
  extra?: Record<string, unknown>;
};

export function safeJsonStringify(value: unknown, fallback = "{}"): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

export function buildSourceMetadataJson(input: ThyronixSourceMetadataInput): string {
  return safeJsonStringify(
    {
      sourceType: input.sourceType,
      templateId: input.templateId,
      sourceUrl: input.sourceUrl,
      sourceId: input.sourceId,
      raw: input.raw,
      ...(input.extra || {}),
    },
    "{}",
  );
}

export function parseVariantData(raw?: string | null): Array<Record<string, unknown>> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      : [];
  } catch {
    return [];
  }
}
