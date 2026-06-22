import { prisma } from "@/lib/db";
import { getBezosAllowedEmails } from "./bezos-bayi-access";
import {
  VHT_FEED_DEFINITIONS,
  buildVhtSourcePayload,
  loadVhtFeedUrlMap,
  listVhtFeedsWithUrls,
  type VhtFeedDefinition,
} from "./vht-supplier-feeds";
import {
  fetchAndParseXmlFeeds,
  maskFeedUrl,
  parseFixedValues,
  productToThyronixRow,
  resolveSourceFeedUrls,
} from "../feed-fetch";
import { getTemplate } from "../templates";

export async function resolveVhtTargetDealerId(): Promise<string | null> {
  const dealerIdFromEnv = process.env.BEZOS_BAYI_TARGET_DEALER_ID?.trim();
  if (dealerIdFromEnv) return dealerIdFromEnv;

  for (const email of getBezosAllowedEmails()) {
    const user = await prisma.user.findFirst({
      where: { email, dealerId: { not: null } },
      select: { dealerId: true },
    });
    if (user?.dealerId) return user.dealerId;
  }
  return null;
}

export function getVhtFeedStatus() {
  const feeds = listVhtFeedsWithUrls();
  const withUrl = feeds.filter((f) => f.hasUrl);
  return {
    total: feeds.length,
    configured: withUrl.length,
    missing: feeds.filter((f) => !f.hasUrl).map((f) => f.code),
    feeds: feeds.map((f) => ({
      code: f.code,
      name: f.name,
      supplier: f.supplier,
      inputFormat: f.inputFormat,
      hasUrl: f.hasUrl,
      urlMasked: f.url ? maskFeedUrl(f.url) : null,
    })),
  };
}

async function upsertVhtSource(def: VhtFeedDefinition, url: string, dealerId: string) {
  const payload = buildVhtSourcePayload(def, url);
  const existing = await prisma.thyronixSource.findFirst({
    where: {
      dealerId,
      OR: [
        { name: payload.name },
        { fixedValues: { contains: `"_supplierCode":"${def.code}"` } },
      ],
    },
  });

  if (existing) {
    return prisma.thyronixSource.update({
      where: { id: existing.id },
      data: { ...payload, status: "active", errorLog: null },
    });
  }

  return prisma.thyronixSource.create({
    data: {
      ...payload,
      dealerId,
      tenantScope: "DEALER",
      ownerType: "DEALER",
    },
  });
}

export async function syncVhtSourceById(sourceId: string) {
  const source = await prisma.thyronixSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error(`Kaynak yok: ${sourceId}`);

  const template = getTemplate(source.inputFormat || "custom_xml");
  if (!template) throw new Error(`Şablon yok: ${source.inputFormat}`);

  let fieldMapping: Record<string, string> | undefined;
  if (source.fieldMapping) {
    try {
      fieldMapping = JSON.parse(source.fieldMapping) as Record<string, string>;
    } catch {
      fieldMapping = undefined;
    }
  }

  const fixedValues = parseFixedValues(source.fixedValues);
  const feedUrls = resolveSourceFeedUrls(source.xmlUrl, source.fixedValues);
  const { products } = await fetchAndParseXmlFeeds(feedUrls, template, fieldMapping);

  const seen = new Set<string>();
  const rows = [];
  for (const p of products) {
    const row = productToThyronixRow(p, sourceId, fixedValues);
    if (seen.has(row.externalId)) continue;
    seen.add(row.externalId);
    rows.push(row);
  }

  await prisma.thyronixProduct.deleteMany({ where: { sourceId } });
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.thyronixProduct.createMany({ data: rows.slice(i, i + BATCH) });
  }

  await prisma.thyronixSource.update({
    where: { id: sourceId },
    data: {
      productCount: rows.length,
      lastSync: new Date(),
      status: "active",
      errorLog: null,
    },
  });

  return rows.length;
}

export type VhtSeedResult = {
  code: string;
  id: string;
  count?: number;
  error?: string;
};

export async function seedVhtSupplierFeeds(options?: { sync?: boolean; codes?: string[] }) {
  const dealerId = await resolveVhtTargetDealerId();
  if (!dealerId) {
    throw new Error("Hedef bayi bulunamadı (BEZOS_BAYI_TARGET_DEALER_ID veya BEZOS_BAYI_ALLOWED_EMAILS)");
  }

  const urlMap = loadVhtFeedUrlMap();
  const filter = (options?.codes || []).map((c) => c.toUpperCase());
  const defs = VHT_FEED_DEFINITIONS.filter((d) => (filter.length ? filter.includes(d.code) : true));

  const results: VhtSeedResult[] = [];

  for (const def of defs) {
    const url = urlMap[def.code];
    if (!url) {
      results.push({ code: def.code, id: "", error: "URL yapılandırması yok" });
      continue;
    }

    try {
      const source = await upsertVhtSource(def, url, dealerId);
      if (options?.sync) {
        const count = await syncVhtSourceById(source.id);
        results.push({ code: def.code, id: source.id, count });
      } else {
        results.push({ code: def.code, id: source.id });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ code: def.code, id: "", error: msg });

      const failed = await prisma.thyronixSource.findFirst({
        where: { dealerId, name: `${def.code} — ${def.name}` },
      });
      if (failed) {
        await prisma.thyronixSource.update({
          where: { id: failed.id },
          data: { status: "error", errorLog: msg.slice(0, 2000) },
        });
      }
    }
  }

  return { dealerId, results };
}
