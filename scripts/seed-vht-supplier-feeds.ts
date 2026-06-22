/**
 * VHT tedarikçi feed kaynaklarını Thyronix'e ekler/günceller.
 * Run: npx tsx scripts/seed-vht-supplier-feeds.ts
 * Import: npx tsx scripts/seed-vht-supplier-feeds.ts --sync
 * Sync one: npx tsx scripts/seed-vht-supplier-feeds.ts --sync VHT1
 */
import { prisma } from "../src/lib/db";
import { getBezosAllowedEmails } from "../src/lib/thyronix/connectors/bezos-bayi-access";
import {
  VHT_FEED_DEFINITIONS,
  buildVhtSourcePayload,
  loadVhtFeedUrlMap,
  type VhtFeedDefinition,
} from "../src/lib/thyronix/connectors/vht-supplier-feeds";
import {
  fetchAndParseXmlFeeds,
  parseFixedValues,
  productToThyronixRow,
  resolveSourceFeedUrls,
  maskFeedUrl,
} from "../src/lib/thyronix/feed-fetch";
import { getTemplate } from "../src/lib/thyronix/templates";

async function resolveTargetDealerId(): Promise<string | null> {
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

async function upsertSource(def: VhtFeedDefinition, url: string, dealerId: string) {
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

async function syncSource(sourceId: string) {
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

async function main() {
  const args = process.argv.slice(2);
  const doSync = args.includes("--sync");
  const filter = args.filter((a) => !a.startsWith("--")).map((s) => s.toUpperCase());

  const dealerId = await resolveTargetDealerId();
  if (!dealerId) {
    console.error("Hedef bayi bulunamadı. BEZOS_BAYI_TARGET_DEALER_ID veya BEZOS_BAYI_ALLOWED_EMAILS ayarlayın.");
    process.exit(1);
  }

  const urlMap = loadVhtFeedUrlMap();
  const defs = VHT_FEED_DEFINITIONS.filter((d) => (filter.length ? filter.includes(d.code) : true));

  console.log(`Hedef bayi: ${dealerId}`);
  console.log(`${defs.length} VHT feed işlenecek\n`);

  const created: Array<{ code: string; id: string; count?: number; error?: string }> = [];

  for (const def of defs) {
    const url = urlMap[def.code];
    if (!url) {
      console.log(`✗ ${def.code} — URL yok, atlandı`);
      created.push({ code: def.code, id: "", error: "URL yok" });
      continue;
    }

    try {
      const source = await upsertSource(def, url, dealerId);
      console.log(`✓ ${def.code} kaynak: ${source.id} (${maskFeedUrl(url)})`);

      if (doSync) {
        process.stdout.write(`  sync... `);
        const count = await syncSource(source.id);
        console.log(`${count} ürün`);
        created.push({ code: def.code, id: source.id, count });
      } else {
        created.push({ code: def.code, id: source.id });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`✗ ${def.code} — ${msg}`);
      created.push({ code: def.code, id: "", error: msg });

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

  console.log("\n=== Sonuç ===");
  console.log(JSON.stringify(created, null, 2));
  console.log("\nPanel: /thyronix/sources");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
