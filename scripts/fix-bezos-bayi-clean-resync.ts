/**
 * Bezos BAYİ XML kaynak URL'lerini düzeltir (BAYİ → BAYi) ve temiz sync yapar.
 * Run: npx tsx scripts/fix-bezos-bayi-clean-resync.ts
 */
import { prisma } from "../src/lib/db";
import { BEZOS_BAYI_XML, buildBezosSourcePayload } from "../src/lib/thyronix/connectors/bezos-bayi-xml";
import { getBezosAllowedEmails } from "../src/lib/thyronix/connectors/bezos-bayi-access";
import { getTemplate } from "../src/lib/thyronix/templates";
import {
  fetchAndParseXmlFeeds,
  parseFixedValues,
  productToThyronixRow,
  resolveSourceFeedUrls,
} from "../src/lib/thyronix/feed-fetch";

const CORRECT_PRIMARY = BEZOS_BAYI_XML.primaryUrl;

function isBrokenBezosUrl(url: string) {
  return url.includes("BAY%C4%B0") || url.includes("BAYİ") || !url.includes("BAYi");
}

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

async function syncSource(sourceId: string) {
  const source = await prisma.thyronixSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error(`Kaynak yok: ${sourceId}`);

  const template = getTemplate(source.inputFormat || "bezos");
  if (!template) throw new Error("Bezos şablonu bulunamadı");

  const fixedValues = parseFixedValues(source.fixedValues);
  const feedUrls = resolveSourceFeedUrls(source.xmlUrl, source.fixedValues);
  console.log("  Feed URL'leri:", feedUrls.join("\n             "));

  const { products, feedStats } = await fetchAndParseXmlFeeds(feedUrls, template, {});
  const seen = new Set<string>();
  const rows: ReturnType<typeof productToThyronixRow>[] = [];

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

  console.log(`  ✓ ${rows.length} ürün içe aktarıldı`);
  for (const f of feedStats) {
    console.log(`    ${f.error ? "✗" : "✓"} ${f.url}${f.error ? ` — ${f.error}` : ` (${f.count})`}`);
  }
}

async function main() {
  const dealerId = await resolveTargetDealerId();
  if (!dealerId) {
    console.error("Hedef bayi bulunamadı.");
    process.exit(1);
  }

  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  const payload = buildBezosSourcePayload(dealer?.name || dealer?.company || "Bayi");

  const sources = await prisma.thyronixSource.findMany({
    where: {
      OR: [
        { inputFormat: "bezos" },
        { xmlUrl: { contains: "bezos.com.tr/xml-bayi" } },
        { dealerId, name: { contains: "Bezos" } },
      ],
    },
  });

  if (sources.length === 0) {
    const created = await prisma.thyronixSource.create({
      data: { ...payload, dealerId, tenantScope: "DEALER", ownerType: "DEALER" },
    });
    console.log("✓ Yeni Bezos kaynağı oluşturuldu:", created.id);
    await syncSource(created.id);
    return;
  }

  for (const src of sources) {
    const needsUrlFix = isBrokenBezosUrl(src.xmlUrl);
    console.log(`\n→ ${src.name} (${src.id})`);
    if (needsUrlFix) console.log("  URL düzeltiliyor (BAYİ → BAYi, www)...");

    await prisma.thyronixSource.update({
      where: { id: src.id },
      data: {
        name: src.dealerId === dealerId ? payload.name : src.name,
        xmlUrl: CORRECT_PRIMARY,
        inputFormat: "bezos",
        fixedValues: payload.fixedValues,
        fieldMapping: payload.fieldMapping,
        status: "active",
        errorLog: null,
      },
    });

    console.log("  Eski ürünler siliniyor...");
    const deleted = await prisma.thyronixProduct.deleteMany({ where: { sourceId: src.id } });
    console.log(`  ${deleted.count} ürün silindi, yeniden sync...`);
    await syncSource(src.id);
  }

  console.log("\n✓ Bezos BAYİ temiz import tamamlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
