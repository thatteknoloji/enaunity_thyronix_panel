import { prisma } from "@/lib/db";
import { fetchSingleMeta } from "@/lib/linkslash/meta-fetch";
import {
  buildMobileTags,
  detectMobileSourceType,
  extractPrimaryUrl,
  mobileSourceToCategory,
  type MobileSourceType,
} from "@/lib/linkslash/mobile-source-type";
import { extractDomain } from "@/lib/linkslash/source-type";
import { getSyncContext } from "@/lib/linkslash/sync/context";
import { cloudLinkFromCapture } from "@/lib/linkslash/sync/service";
import { logLinkSlashImport } from "@/lib/linkslash/analytics";

export type CaptureInput = {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  domain?: string;
  sourceType?: string;
  tags?: string[];
  rawText?: string;
  sharedFrom?: string;
  client?: "mobile" | "extension" | "web";
};

export type CaptureRecord = {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
  domain: string;
  sourceType: string;
  tagsJson: string;
  aiSummary: string;
  aiCategory: string;
  createdAt: Date;
};

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("URL gerekli");
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Geçersiz URL protokolü");
    }
    return parsed.toString();
  } catch {
    throw new Error("Geçersiz URL");
  }
}

export async function createLinkSlashCapture(
  userId: string,
  dealerId: string | null | undefined,
  input: CaptureInput
): Promise<CaptureRecord> {
  const rawText = input.rawText?.trim() || "";
  const sharedFrom = input.sharedFrom?.trim() || "";
  const urlInput = input.url?.trim() || extractPrimaryUrl(rawText);
  const url = normalizeUrl(urlInput);
  const domain = input.domain?.trim() || extractDomain(url);
  const mobileSource = (input.sourceType?.trim() ||
    detectMobileSourceType(url, sharedFrom)) as MobileSourceType;
  const tags = input.tags?.length
    ? input.tags
    : buildMobileTags(mobileSource, domain, sharedFrom);

  let title = input.title?.trim() || "";
  let description = input.description?.trim() || rawText.slice(0, 500);
  let image = input.image?.trim() || "";
  let favicon = input.favicon?.trim() || "";

  if (!title || !description || !image) {
    try {
      const meta = await fetchSingleMeta(url, 8000);
      if (!title && meta.title) title = meta.title;
      if (!description && meta.description) description = meta.description;
      if (!image && meta.image) image = meta.image;
      if (!favicon && meta.favicon) favicon = meta.favicon;
    } catch {
      // Meta fetch optional
    }
  }

  if (!title) title = domain || url;

  const aiCategory = mobileSourceToCategory(mobileSource);

  const record = await prisma.linkSlashCapture.create({
    data: {
      userId,
      dealerId: dealerId || "",
      url,
      title: title.slice(0, 500),
      description: description.slice(0, 2000),
      image: image.slice(0, 500),
      favicon: favicon.slice(0, 500),
      domain,
      sourceType: mobileSource,
      tagsJson: JSON.stringify(tags),
      aiCategory,
      status: "pending",
    },
  });

  let cloudLinkId: string | undefined;
  try {
    const ctx = getSyncContext({ id: userId, role: "dealer", dealerId: dealerId || "" });
    const cloud = await cloudLinkFromCapture(ctx, {
      url,
      title: record.title,
      description: record.description,
      image: record.image,
      favicon: record.favicon,
      domain,
      sourceType: mobileSource,
      tagsJson: record.tagsJson,
      aiSummary: "",
      aiCategory,
    });
    cloudLinkId = cloud?.id;
  } catch {
    // Cloud upsert best-effort during capture
  }

  void enrichCaptureWithAi({
    captureId: record.id,
    cloudLinkId,
    userId,
    dealerId,
    url,
    title: record.title,
    description: record.description,
    sourceType: mobileSource,
  });

  void logLinkSlashImport({
    userId,
    dealerId,
    url,
    sourceType: mobileSource,
    sharedFrom,
    client: input.client || "mobile",
    status: "saved",
  }).catch(() => {});

  return record;
}

async function enrichCaptureWithAi(input: {
  captureId: string;
  cloudLinkId?: string;
  userId: string;
  dealerId?: string | null;
  url: string;
  title: string;
  description: string;
  sourceType: string;
}) {
  try {
    const { analyzeLinkContent } = await import("@/lib/linkslash/ai-analyze");
    const result = await analyzeLinkContent({
      linkId: input.cloudLinkId,
      url: input.url,
      title: input.title,
      description: input.description,
      sourceType: input.sourceType,
      userId: input.userId,
      dealerId: input.dealerId,
      save: !!input.cloudLinkId,
    });

    await prisma.linkSlashCapture.update({
      where: { id: input.captureId },
      data: {
        aiSummary: result.aiSummary?.slice(0, 2000) || "",
        aiCategory: result.aiCategorySuggestion || undefined,
      },
    });
  } catch {
    try {
      const meta = await fetchSingleMeta(input.url, 5000);
      const summaryText = meta.text_content || meta.description || input.description;
      await prisma.linkSlashCapture.update({
        where: { id: input.captureId },
        data: {
          aiSummary: summaryText ? summaryText.slice(0, 600) : "",
          description: input.description || meta.description || "",
          image: meta.image || undefined,
          favicon: meta.favicon || undefined,
        },
      });
    } catch {
      // Meta enrichment best-effort
    }
  }
}

export async function getPendingCaptures(userId: string): Promise<CaptureRecord[]> {
  return prisma.linkSlashCapture.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export async function ackCaptures(userId: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const result = await prisma.linkSlashCapture.updateMany({
    where: { userId, id: { in: ids }, status: "pending" },
    data: { status: "synced", syncedAt: new Date() },
  });
  return result.count;
}
