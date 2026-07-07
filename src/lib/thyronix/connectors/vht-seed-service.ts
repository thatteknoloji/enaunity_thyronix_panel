import { prisma } from "@/lib/db";
import { getBezosAllowedEmails } from "./bezos-bayi-access";
import { buildBezosSourcePayload } from "./bezos-bayi-xml";
import {
  VHT_FEED_DEFINITIONS,
  buildVhtSourcePayload,
  loadErsaGuduFeedUrlMap,
  loadVhtFeedUrlMap,
  listVhtFeedsWithUrls,
  resolveErsaVhtSeedCodes,
  resolveVhtFeedCodes,
  ERSA_BEZOS_VHT_CODES,
  type VhtFeedBundle,
  type VhtFeedDefinition,
} from "./vht-supplier-feeds";
import { maskFeedUrl } from "../feed-fetch";
import { syncThyronixSourceById } from "../source-sync-runner";
import { DEFAULT_THYRONIX_SYNC_INTERVAL } from "../sync-interval";

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

export function getVhtFeedStatus(options?: { bundle?: VhtFeedBundle; codes?: string[] }) {
  const feeds = listVhtFeedsWithUrls(options);
  const withUrl = feeds.filter((f) => f.hasUrl);
  return {
    bundle: options?.bundle || (options?.codes?.length ? "custom" : "all"),
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

async function upsertErsaBezosSource(dealerId: string, primaryUrl: string, offsetUrl: string) {
  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  const base = buildBezosSourcePayload(dealer?.name || dealer?.company || "Ersa Güdü");
  const fixed = {
    ...JSON.parse(base.fixedValues || "{}"),
    _supplierCode: "VHT38",
    _feedUrls: [primaryUrl, offsetUrl],
  };
  const payload = {
    ...base,
    name: "VHT38 — Bezos BAYİ XML",
    xmlUrl: primaryUrl,
    interval: DEFAULT_THYRONIX_SYNC_INTERVAL,
    fixedValues: JSON.stringify(fixed),
  };

  const existing = await prisma.thyronixSource.findFirst({
    where: {
      dealerId,
      OR: [
        { inputFormat: "bezos" },
        { fixedValues: { contains: `"_supplierCode":"VHT38"` } },
        { xmlUrl: { contains: "bezos.com.tr/xml-bayi" } },
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

async function syncSourceIfRequested(sourceId: string, sync?: boolean) {
  if (!sync) return undefined;
  const mergeResult = await syncThyronixSourceById(sourceId, { snapshot: false });
  return mergeResult.total;
}

export type VhtSeedResult = {
  code: string;
  id: string;
  count?: number;
  error?: string;
};

export async function seedVhtSupplierFeeds(options?: {
  sync?: boolean;
  codes?: string[];
  bundle?: VhtFeedBundle;
}) {
  const dealerId = await resolveVhtTargetDealerId();
  if (!dealerId) {
    throw new Error("Hedef bayi bulunamadı (BEZOS_BAYI_TARGET_DEALER_ID veya BEZOS_BAYI_ALLOWED_EMAILS)");
  }

  const urlMap = loadVhtFeedUrlMap({ bundle: options?.bundle });
  const filter = new Set(resolveVhtFeedCodes(options));
  const defs = VHT_FEED_DEFINITIONS.filter((d) => filter.has(d.code));

  const results: VhtSeedResult[] = [];

  for (const def of defs) {
    if (def.inputFormat === "bezos") {
      continue;
    }
    const url = urlMap[def.code];
    if (!url) {
      results.push({ code: def.code, id: "", error: "URL yapılandırması yok" });
      continue;
    }

    try {
      const source = await upsertVhtSource(def, url, dealerId);
      const count = await syncSourceIfRequested(source.id, options?.sync);
      results.push({ code: def.code, id: source.id, ...(count != null ? { count } : {}) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ code: def.code, id: "", error: msg });
      await markSourceError(dealerId, def, msg);
    }
  }

  return { dealerId, bundle: options?.bundle || (options?.codes?.length ? "custom" : "all"), results };
}

async function markSourceError(dealerId: string, def: VhtFeedDefinition, msg: string) {
  const failed = await prisma.thyronixSource.findFirst({
    where: {
      dealerId,
      OR: [
        { name: `${def.code} — ${def.name}` },
        { fixedValues: { contains: `"_supplierCode":"${def.code}"` } },
      ],
    },
  });
  if (failed) {
    await prisma.thyronixSource.update({
      where: { id: failed.id },
      data: { status: "error", errorLog: msg.slice(0, 2000) },
    });
  }
}

/** Ersa Güdü — 18 feed (16 VHT + Bezos birleşik VHT38/39). */
export async function seedErsaGuduPackage(options?: { sync?: boolean }) {
  const dealerId = await resolveVhtTargetDealerId();
  if (!dealerId) {
    throw new Error("Hedef bayi bulunamadı (BEZOS_BAYI_TARGET_DEALER_ID veya BEZOS_BAYI_ALLOWED_EMAILS)");
  }

  const urlMap = loadErsaGuduFeedUrlMap();
  const results: VhtSeedResult[] = [];

  for (const code of resolveErsaVhtSeedCodes()) {
    const def = VHT_FEED_DEFINITIONS.find((d) => d.code === code);
    if (!def) {
      results.push({ code, id: "", error: "Tanım bulunamadı" });
      continue;
    }
    const url = urlMap[code];
    if (!url) {
      results.push({ code, id: "", error: "URL yapılandırması yok" });
      continue;
    }

    try {
      const source = await upsertVhtSource(def, url, dealerId);
      const count = await syncSourceIfRequested(source.id, options?.sync);
      results.push({ code, id: source.id, ...(count != null ? { count } : {}) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ code, id: "", error: msg });
      await markSourceError(dealerId, def, msg);
    }
  }

  const bezosPrimary = urlMap[ERSA_BEZOS_VHT_CODES[0]];
  const bezosOffset = urlMap[ERSA_BEZOS_VHT_CODES[1]];
  if (!bezosPrimary || !bezosOffset) {
    for (const code of ERSA_BEZOS_VHT_CODES) {
      if (!urlMap[code]) {
        results.push({ code, id: "", error: "Bezos URL yapılandırması yok" });
      }
    }
  } else {
    try {
      const source = await upsertErsaBezosSource(dealerId, bezosPrimary, bezosOffset);
      const count = await syncSourceIfRequested(source.id, options?.sync);
      results.push({ code: "VHT38", id: source.id, ...(count != null ? { count } : {}) });
      results.push({ code: "VHT39", id: source.id, ...(count != null ? { count } : {}) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ code: "VHT38", id: "", error: msg });
      results.push({ code: "VHT39", id: "", error: msg });
    }
  }

  const ok = results.filter((r) => r.id && !r.error).length;
  const uniqueSources = new Set(results.filter((r) => r.id).map((r) => r.id)).size;

  return {
    dealerId,
    bundle: "ersa" as const,
    totalFeeds: 18,
    configuredResults: ok,
    uniqueSources,
    results,
  };
}
