import { prisma } from "../src/lib/db";
import { ERSA_GUDU_STARTER_RULES } from "./seed-ersa-rules";
import {
  ensureDefaultGlobalProfile,
  updateRulesProfile,
} from "../src/lib/thyronix/rules/profile-service";
import { ensureSourceFeedsForSources } from "../src/lib/thyronix/source-feed-provision";
import { warmFeedXmlCache } from "../src/lib/thyronix/feed-cache-warm";

export async function seedRules(dealerId: string) {
  const profile = await ensureDefaultGlobalProfile(dealerId);
  await updateRulesProfile(profile.id, dealerId, {
    name: "Genel Kurallar — Ersa Güdü",
    ...ERSA_GUDU_STARTER_RULES,
  });

  const ws = await prisma.thyronixWorkspaceSettings.findFirst({ where: { dealerId } });
  if (ws) {
    let automation: Record<string, unknown> = {};
    try {
      automation = JSON.parse(ws.automationJson || "{}");
    } catch {
      automation = {};
    }
    automation.feedTransform = {
      enabled: true,
      targetBrand: "Esra'nın Dünyası",
      sourceBrandAliases: ["BEZOS", "BEZOS HOME", "Bayi Markası"],
      bannedWords: ["çakma", "taklit", "replika", "muadil"],
      titlePrefix: "",
      titleSuffix: "",
      descriptionPrefix: "",
      descriptionSuffix: "",
      maxTitleLength: 120,
    };
    await prisma.thyronixWorkspaceSettings.update({
      where: { id: ws.id },
      data: { automationJson: JSON.stringify(automation) },
    });
  }
}

export async function ensureCombinedOutputFeed(dealerId: string) {
  const existing = await prisma.thyronixFeed.findFirst({
    where: { dealerId, sourceId: null },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.thyronixFeed.create({
    data: {
      name: "Esra'nın Dünyası — Birleşik XML",
      channel: "marketplace",
      status: "active",
      outputFormat: "jetteknoloji",
      mergeStrategy: "lowest_price",
      schedule: 24,
      interval: 1440,
      dealerId,
      tenantScope: "DEALER",
      ownerType: "DEALER",
    },
  });
}

export async function provisionAndPublishOutputs(dealerId: string) {
  const sources = await prisma.thyronixSource.findMany({
    where: { dealerId, status: "active" },
    select: {
      id: true,
      name: true,
      type: true,
      inputFormat: true,
      status: true,
      productCount: true,
      lastSync: true,
      dealerId: true,
      tenantScope: true,
      ownerType: true,
    },
    orderBy: { name: "asc" },
  });

  const perSourceFeeds = await ensureSourceFeedsForSources(sources);
  const combinedFeed = await ensureCombinedOutputFeed(dealerId);
  const allFeeds = [...perSourceFeeds, combinedFeed];

  console.log(`Çıktı feed: ${perSourceFeeds.length} kaynak + 1 birleşik`);

  for (const feed of allFeeds) {
    try {
      const result = await warmFeedXmlCache(feed.id);
      console.log(`✓ ${feed.name} — ${result.productCount.toLocaleString("tr-TR")} ürün (${result.plan.partCount} parça)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`✗ ${feed.name} — ${msg}`);
    }
  }
}
