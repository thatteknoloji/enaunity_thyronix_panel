import { prisma } from "@/lib/db";
import { fetchSingleMeta } from "@/lib/linkslash/meta-fetch";
import {
  buildDefaultTags,
  detectSourceType,
  extractDomain,
  sourceTypeToCategory,
  type LinkSlashSourceType,
} from "@/lib/linkslash/source-type";

export type CaptureInput = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  domain?: string;
  sourceType?: string;
  tags?: string[];
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
  const url = normalizeUrl(input.url);
  const domain = input.domain?.trim() || extractDomain(url);
  const sourceType = (input.sourceType?.trim() || detectSourceType(url)) as LinkSlashSourceType;
  const tags = buildDefaultTags(sourceType, domain, input.tags || []);

  let title = input.title?.trim() || "";
  let description = input.description?.trim() || "";
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

  const aiCategory = sourceTypeToCategory(sourceType);

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
      sourceType,
      tagsJson: JSON.stringify(tags),
      aiCategory,
      status: "pending",
    },
  });

  void enrichCaptureWithAi(record.id, url, title, description);

  return record;
}

async function enrichCaptureWithAi(id: string, url: string, title: string, description: string) {
  try {
    const meta = await fetchSingleMeta(url, 5000);
    const summaryText = meta.text_content || meta.description || description;
    const aiSummary = summaryText ? summaryText.slice(0, 600) : "";

    await prisma.linkSlashCapture.update({
      where: { id },
      data: {
        aiSummary,
        description: description || meta.description || "",
        image: meta.image || undefined,
        favicon: meta.favicon || undefined,
      },
    });
  } catch {
    // AI enrichment is best-effort
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
