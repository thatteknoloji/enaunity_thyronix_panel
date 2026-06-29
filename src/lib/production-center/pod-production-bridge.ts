import { listAllPodCoreProjects } from "@/lib/pod-core/project-store";
import type { PodCoreProjectRecord } from "@/lib/pod-core/pod-types";
import { resolvePodFromGraph, resolveProductionFromGraph } from "@/lib/product-engine/graph-resolvers";
import type { CreateProductionJobInput } from "./types";

function dataUrlToPathHint(dataUrl: string, ext: string): string {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  return `data:${ext};embedded`;
}

export async function findPodProjectById(projectId: string): Promise<PodCoreProjectRecord | null> {
  const all = await listAllPodCoreProjects();
  return all.find((p) => p.projectId === projectId) ?? null;
}

/** POD Production Pack varsa dosya yollarını ve fiyat snapshot'ını döner */
export async function resolvePodProductionAssets(
  podProjectId: string
): Promise<Partial<CreateProductionJobInput>> {
  const project = await findPodProjectById(podProjectId);
  if (!project) return {};

  const pack = project.productionPack;
  const graphPod = resolvePodFromGraph({ templateId: project.templateId });
  const graphProd = resolveProductionFromGraph({ templateId: project.templateId });
  const patch: Partial<CreateProductionJobInput> = {
    orderSource: "POD_ORDER",
    orderId: project.projectId,
    productType: graphPod?.displayName ?? project.mockupTemplate?.name ?? project.projectName,
    variant: project.templateId,
    widthCm: project.widthCm,
    heightCm: project.heightCm,
    quantity: project.quantity,
    priority: graphProd?.defaultPriority ?? "NORMAL",
    machineName: graphProd?.machineType ?? "",
    pricingSnapshot: (project.pricingSnapshot as Record<string, unknown> | null) ?? undefined,
    metadata: {
      podProjectId: project.projectId,
      podProjectName: project.projectName,
      templateId: project.templateId,
      productCode: graphPod?.productCode,
      productionProfile: graphProd?.productionProfile,
      packagingProfile: graphProd?.packagingProfile,
    },
  };

  if (pack) {
    patch.productionPackPath = `pod://${project.projectId}/production-pack`;
    patch.productionImage = pack.productionPngBase64
      ? dataUrlToPathHint(`data:image/png;base64,${pack.productionPngBase64}`, "image/png")
      : "";
    patch.pdfPath = pack.productionPdfBase64
      ? dataUrlToPathHint(`data:application/pdf;base64,${pack.productionPdfBase64}`, "application/pdf")
      : "";
    patch.previewImage = project.mockupTemplate?.image ?? "";
  }

  return patch;
}

export function podPackDownloadUrls(project: PodCoreProjectRecord): {
  productionImage?: string;
  pdfPath?: string;
  previewImage?: string;
  productionPackPath?: string;
  metadata?: Record<string, unknown>;
} {
  const pack = project.productionPack;
  if (!pack) return {};
  return {
    productionPackPath: `pod://${project.projectId}/production-pack`,
    previewImage: project.mockupTemplate?.image ?? "",
    productionImage: pack.productionPngBase64
      ? `data:image/png;base64,${pack.productionPngBase64}`
      : undefined,
    pdfPath: pack.productionPdfBase64
      ? `data:application/pdf;base64,${pack.productionPdfBase64}`
      : undefined,
    metadata: pack.metadataJson as Record<string, unknown>,
  };
}
