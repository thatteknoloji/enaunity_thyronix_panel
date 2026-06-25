"use client";

import { useCallback, useState } from "react";
import {
  createProductionFile,
  documentToJsonString,
  downloadBlob,
  downloadProductionBundle,
  exportCanvasPdf,
  exportCanvasPng,
} from "@/lib/pod-core/design-export-engine";
import type { ExportCropMode, ExportDpi } from "@/lib/pod-core/pod-types";
import {
  savePodCoreProject,
} from "@/lib/pod-core/pod-order-bridge";
import { usePodCore } from "@/components/pod-core/pod-core-context";

export function usePodEditorActions() {
  const ctx = usePodCore();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const saveProject = useCallback(async () => {
    const { engine, mockupTemplate, widthCm, heightCm, quantity, customerType, pricing, projectId, projectName, exportCount, setProjectMeta } = ctx;
    if (!engine) return;
    setBusy("save");
    setActionError(null);
    try {
      const result = await savePodCoreProject({
        ownerUserId: "",
        projectId: projectId ?? undefined,
        projectName,
        engine,
        mockupTemplate,
        widthCm,
        heightCm,
        quantity,
        customerType,
        pricing,
        includeProductionPack: true,
        exportCount,
      });
      setProjectMeta({
        projectId: result.project.projectId,
        projectName: result.project.projectName,
        lastSavedAt: Date.now(),
        exportCount: result.project.exportCount,
        pricingSnapshot: result.project.pricingSnapshot,
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Kayıt hatası");
      throw e;
    } finally {
      setBusy(null);
    }
  }, [ctx]);

  const runExport = useCallback(
    async (kind: "png" | "pdf" | "production", dpi: ExportDpi = 300, crop: ExportCropMode = "print") => {
      const { engine, mockupTemplate } = ctx;
      const bundle = engine?.getPrintAreaBundle();
      if (!engine?.canvas || !bundle) return;
      setBusy(kind);
      setActionError(null);
      try {
        if (kind === "png") {
          const blob = await exportCanvasPng(engine.canvas, { crop, bundle, dpi, transparent: crop !== "full" });
          downloadBlob(blob, `ena-export-${dpi}dpi-${Date.now()}.png`);
        } else if (kind === "pdf") {
          const blob = await exportCanvasPdf(engine.canvas, { crop, bundle, dpi });
          downloadBlob(blob, `ena-export-${dpi}dpi-${Date.now()}.pdf`);
        } else {
          const files = await createProductionFile(engine.canvas, bundle, {
            dpi,
            crop,
            templateId: mockupTemplate.id,
            transparentProduction: true,
          });
          downloadProductionBundle(files);
        }
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Export hatası");
        throw e;
      } finally {
        setBusy(null);
      }
    },
    [ctx]
  );

  const exportJson = useCallback(() => {
    const { engine } = ctx;
    if (!engine) return;
    const doc = engine.serialize();
    const blob = new Blob([documentToJsonString(doc)], { type: "application/json" });
    downloadBlob(blob, `ena-pod-${Date.now()}.json`);
  }, [ctx]);

  return { saveProject, runExport, exportJson, busy, actionError, setActionError };
}
