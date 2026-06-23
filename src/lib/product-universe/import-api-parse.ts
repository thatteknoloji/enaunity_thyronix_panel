import type { DuplicateMode } from "./import-types";

export type ParsedImportCommitForm = {
  sourceType: string;
  projectId?: string;
  dryRun: boolean;
  downloadImages: boolean;
  duplicateMode: DuplicateMode;
  runAnalysis: boolean;
  generateBlueprintPreview: boolean;
  limit?: number;
  minQuality?: number;
  mapping?: Record<string, string>;
  autoGenerateUniverse: boolean;
  autoRunPipeline: boolean;
  autoPublishInternal: boolean;
  pipelineLimit: number;
  minPublishScore: number;
  includeGeo: boolean;
  stopOnError: boolean;
};

export function parseImportCommitForm(form: FormData): ParsedImportCommitForm {
  const type = String(form.get("sourceType") || form.get("type") || "CSV");
  const projectId = form.get("projectId") ? String(form.get("projectId")) : undefined;
  const dryRun = String(form.get("dryRun") || "false") === "true";
  const downloadImages = String(form.get("downloadImages") || "false") === "true";
  const duplicateMode = (String(form.get("duplicateMode") || "skip")) as DuplicateMode;
  const runAnalysis = String(form.get("runAnalysis") || "true") === "true";
  const generateBlueprintPreview = String(form.get("generateBlueprintPreview") || "false") === "true";
  const limitRaw = form.get("limit");
  const limit = limitRaw ? parseInt(String(limitRaw), 10) : undefined;
  const minQualityRaw = form.get("minQuality");
  const minQuality = minQualityRaw ? parseInt(String(minQualityRaw), 10) : undefined;
  const mappingRaw = form.get("mapping");

  let mapping: Record<string, string> | undefined;
  if (mappingRaw) {
    try {
      mapping = JSON.parse(String(mappingRaw)) as Record<string, string>;
    } catch {
      throw new Error("mapping JSON geçersiz");
    }
  }

  return {
    sourceType: type,
    projectId,
    dryRun,
    downloadImages,
    duplicateMode,
    runAnalysis,
    generateBlueprintPreview,
    limit,
    minQuality,
    mapping,
    autoGenerateUniverse: String(form.get("autoGenerateUniverse") || "false") === "true",
    autoRunPipeline: String(form.get("autoRunPipeline") || "false") === "true",
    autoPublishInternal: String(form.get("autoPublishInternal") || "false") === "true",
    pipelineLimit: parseInt(String(form.get("pipelineLimit") || "100"), 10) || 100,
    minPublishScore: parseInt(String(form.get("minPublishScore") || "70"), 10) || 70,
    includeGeo: String(form.get("includeGeo") || "false") === "true",
    stopOnError: String(form.get("stopOnError") || "false") === "true",
  };
}

export function validateImportCommitForm(parsed: ParsedImportCommitForm): string | null {
  if (
    (parsed.autoGenerateUniverse || parsed.autoRunPipeline || parsed.autoPublishInternal) &&
    !parsed.projectId
  ) {
    return "Otomasyon için Page Factory projesi seçilmeli";
  }
  if (parsed.autoPublishInternal && !parsed.autoRunPipeline && !parsed.autoGenerateUniverse) {
    return "İç yayın için önce universe üretimi veya pipeline etkin olmalı";
  }
  if (parsed.autoRunPipeline && !parsed.autoGenerateUniverse) {
    return "Pipeline için önce universe üretimi etkin olmalı";
  }
  return null;
}
