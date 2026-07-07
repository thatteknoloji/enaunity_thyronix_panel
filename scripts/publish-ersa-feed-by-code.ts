/**
 * Tek Ersa feed yayınlar (fresh process — SQLite lock önleme).
 * Run: npx tsx scripts/publish-ersa-feed-by-code.ts VHT1
 * Run: npx tsx scripts/publish-ersa-feed-by-code.ts BIRLESIK
 */
import { prisma } from "../src/lib/db";
import { ERSA_GUDU_VHT_CODES } from "../src/lib/thyronix/connectors/vht-supplier-feeds";
import { resolveVhtTargetDealerId } from "../src/lib/thyronix/connectors/vht-seed-service";
import { warmFeedXmlCache } from "../src/lib/thyronix/feed-cache-warm";
import { loadMergedFeedProductsForOutput } from "../src/lib/thyronix/feed-output-service";
import { resolveFeedSourceIds, upsertSourceFeed } from "../src/lib/thyronix/source-feed-provision";
import { ensureCombinedOutputFeed } from "./setup-ersa-gudu-helpers";

async function ensureScriptDbReady() {
  await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;");
  await prisma.$executeRawUnsafe("PRAGMA busy_timeout=30000;");
}

const code = (process.argv[2] || "").toUpperCase();

async function findSource(dealerId: string, feedCode: string) {
  if (feedCode === "VHT38" || feedCode === "BIRLESIK") {
    if (feedCode === "BIRLESIK") return null;
    return prisma.thyronixSource.findFirst({
      where: {
        dealerId,
        OR: [{ fixedValues: { contains: `"_supplierCode":"VHT38"` } }, { inputFormat: "bezos" }],
      },
    });
  }
  return prisma.thyronixSource.findFirst({
    where: {
      dealerId,
      OR: [
        { fixedValues: { contains: `"_supplierCode":"${feedCode}"` } },
        { name: { startsWith: `${feedCode} —` } },
      ],
    },
  });
}

async function main() {
  if (!code) {
    console.error("Kullanım: npx tsx scripts/publish-ersa-feed-by-code.ts VHT1|BIRLESIK");
    process.exit(1);
  }

  await ensureScriptDbReady();

  const dealerId = await resolveVhtTargetDealerId();
  if (!dealerId) process.exit(1);

  if (code === "BIRLESIK") {
    const combined = await ensureCombinedOutputFeed(dealerId);
    const sourceIds: string[] = [];
    for (const c of ERSA_GUDU_VHT_CODES) {
      if (c === "VHT39" || c === "VHT21") continue;
      const s = await findSource(dealerId, c === "VHT38" ? "VHT38" : c);
      if (s) sourceIds.push(s.id);
    }
    const unique = [...new Set(sourceIds)];
    const { products, filterStats } = await loadMergedFeedProductsForOutput(combined, unique);
    if (!products.length) {
      console.log(`✗ Birleşik — 0 çıktı (gate:${filterStats.hiddenByGate} stok:${filterStats.hiddenByStock})`);
      process.exit(1);
    }
    const warmed = await warmFeedXmlCache(combined.id, { sourceIds: unique });
    console.log(`✓ Birleşik — ${warmed.productCount} ürün (${warmed.plan.partCount} parça)`);
    process.exit(0);
  }

  const source = await findSource(dealerId, code);
  if (!source) {
    console.log(`✗ ${code} — kaynak yok`);
    process.exit(1);
  }

  let feed = await prisma.thyronixFeed.findFirst({ where: { sourceId: source.id } });
  if (!feed) {
    feed = await upsertSourceFeed(source);
    console.log(`ℹ ${code} — feed kaydı oluşturuldu`);
  }

  const sourceIds = await resolveFeedSourceIds(feed);
  const { products, filterStats } = await loadMergedFeedProductsForOutput(feed, sourceIds);
  if (!products.length) {
    console.log(`✗ ${feed.name} — 0 çıktı (gate:${filterStats.hiddenByGate} stok:${filterStats.hiddenByStock})`);
    process.exit(1);
  }

  const warmed = await warmFeedXmlCache(feed.id, { sourceIds });
  console.log(`✓ ${feed.name} — ${warmed.productCount} ürün (${warmed.plan.partCount} parça)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
