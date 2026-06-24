import type { AiWriterMetadata } from "./types";

export function parseAiWriterMetadata(raw: unknown): AiWriterMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.writerVersion !== "ENA_AKILLI_ICERIK_YAZARI_V1") return null;
  return obj as unknown as AiWriterMetadata;
}

export function extractAiWriterFromMetadataJson(metadataJson: string): AiWriterMetadata | null {
  try {
    const meta = JSON.parse(metadataJson || "{}") as Record<string, unknown>;
    return parseAiWriterMetadata(meta.aiWriter);
  } catch {
    return null;
  }
}

export function isPublishableAiContent(metadata: AiWriterMetadata | null): {
  publishable: boolean;
  reason?: string;
} {
  if (!metadata) {
    return { publishable: false, reason: "NOT_AI_GENERATED" };
  }
  if (metadata.aiGenerated !== true) {
    return { publishable: false, reason: "NOT_AI_GENERATED" };
  }
  if (metadata.fallbackUsed === true) {
    return { publishable: false, reason: "FALLBACK_USED" };
  }
  if (metadata.generationStatus !== "SUCCESS") {
    return { publishable: false, reason: "GENERATION_FAILED" };
  }
  return { publishable: true };
}
