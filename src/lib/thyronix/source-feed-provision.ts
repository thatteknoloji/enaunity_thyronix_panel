import { prisma } from "@/lib/db";
import { getTemplate, normalizeTemplateId } from "./templates";

export type ThyronixSourceFeedSeed = {
  id: string;
  name: string;
  type: string;
  inputFormat?: string | null;
  status: string;
  productCount: number;
  lastSync: Date | null;
  dealerId: string | null;
  tenantScope: string;
  ownerType: string;
};

function resolveDefaultOutputFormat(source: ThyronixSourceFeedSeed): string {
  const preferred = normalizeTemplateId(source.inputFormat || "custom_xml");
  return getTemplate(preferred) ? preferred : "jetteknoloji";
}

export async function upsertSourceFeed(source: ThyronixSourceFeedSeed) {
  return prisma.thyronixFeed.upsert({
    where: { sourceId: source.id },
    create: {
      sourceId: source.id,
      name: `${source.name}`,
      channel: source.type || "source",
      status: source.status === "active" ? "active" : "paused",
      productCount: source.productCount || 0,
      interval: 1440,
      outputFormat: resolveDefaultOutputFormat(source),
      mergeStrategy: "lowest_price",
      schedule: 24,
      lastPublished: source.lastSync || new Date(),
      dealerId: source.dealerId,
      tenantScope: source.tenantScope as "GLOBAL" | "DEALER",
      ownerType: source.ownerType as "ADMIN" | "DEALER",
    },
    update: {
      name: `${source.name}`,
      channel: source.type || "source",
      status: source.status === "active" ? "active" : "paused",
      productCount: source.productCount || 0,
      interval: 1440,
      outputFormat: resolveDefaultOutputFormat(source),
      schedule: 24,
      lastPublished: source.lastSync || new Date(),
      dealerId: source.dealerId,
      tenantScope: source.tenantScope as "GLOBAL" | "DEALER",
      ownerType: source.ownerType as "ADMIN" | "DEALER",
    },
  });
}

export async function ensureSourceFeedsForSources(sources: ThyronixSourceFeedSeed[]) {
  const results = [];
  for (const source of sources) {
    results.push(await upsertSourceFeed(source));
  }
  return results;
}

export async function resolveFeedSourceIds(feed: { sourceId?: string | null; dealerId?: string | null }): Promise<string[]> {
  if (feed.sourceId) {
    const source = await prisma.thyronixSource.findFirst({
      where: {
        id: feed.sourceId,
        ...(feed.dealerId ? { dealerId: feed.dealerId } : {}),
      },
      select: { id: true },
    });
    return source ? [source.id] : [];
  }
  const sources = await prisma.thyronixSource.findMany({
    where: {
      status: { in: ["active", "error"] },
      productCount: { gt: 0 },
      ...(feed.dealerId ? { dealerId: feed.dealerId } : {}),
    },
    select: { id: true },
  });
  return sources.map((source) => source.id);
}
