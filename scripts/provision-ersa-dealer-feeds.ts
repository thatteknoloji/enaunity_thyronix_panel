/**
 * Ersa Güdü — tüm firma feed'lerini oluşturur, kurallarla yayınlar, bayi sayfasına yazar.
 * Run: npx tsx scripts/provision-ersa-dealer-feeds.ts
 * Sync+publish: npx tsx scripts/provision-ersa-dealer-feeds.ts --sync
 */
import { prisma } from "../src/lib/db";
import {
  ERSA_BEZOS_VHT_CODES,
  ERSA_GUDU_VHT_CODES,
  VHT_FEED_DEFINITIONS,
} from "../src/lib/thyronix/connectors/vht-supplier-feeds";
import { seedErsaGuduPackage, resolveVhtTargetDealerId } from "../src/lib/thyronix/connectors/vht-seed-service";
import { warmFeedXmlCache } from "../src/lib/thyronix/feed-cache-warm";
import { loadMergedFeedProductsForOutput } from "../src/lib/thyronix/feed-output-service";
import { resolveFeedSourceIds } from "../src/lib/thyronix/source-feed-provision";
import { getTemplate, normalizeTemplateId } from "../src/lib/thyronix/templates";
import {
  ensureCombinedOutputFeed,
  seedRules,
} from "./setup-ersa-gudu-helpers";

const SKIP_SYNC = new Set(["VHT21"]);

function parseCode(fixedValues: string | null | undefined): string | null {
  try {
    return JSON.parse(fixedValues || "{}")._supplierCode || null;
  } catch {
    return null;
  }
}

function feedDisplayName(code: string, sourceName: string): string {
  const def = VHT_FEED_DEFINITIONS.find((d) => d.code === code);
  const label = def?.name || sourceName.replace(/^.+?—\s*/, "");
  return `${code} — ${label}`;
}

async function findErsaSource(dealerId: string, code: string) {
  if (ERSA_BEZOS_VHT_CODES.includes(code as (typeof ERSA_BEZOS_VHT_CODES)[number])) {
    if (code === "VHT39") return null;
    return prisma.thyronixSource.findFirst({
      where: {
        dealerId,
        OR: [
          { fixedValues: { contains: `"_supplierCode":"VHT38"` } },
          { inputFormat: "bezos" },
        ],
      },
    });
  }
  return prisma.thyronixSource.findFirst({
    where: {
      dealerId,
      OR: [
        { fixedValues: { contains: `"_supplierCode":"${code}"` } },
        { name: { startsWith: `${code} —` } },
      ],
    },
  });
}

async function upsertErsaSourceFeed(
  dealerId: string,
  code: string,
  source: NonNullable<Awaited<ReturnType<typeof findErsaSource>>>,
) {
  const outputFormat = normalizeTemplateId(source.inputFormat || "jetteknoloji");
  const format = getTemplate(outputFormat) ? outputFormat : "jetteknoloji";
  const name = feedDisplayName(code, source.name);

  return prisma.thyronixFeed.upsert({
    where: { sourceId: source.id },
    create: {
      sourceId: source.id,
      name,
      channel: "marketplace",
      status: "active",
      productCount: 0,
      interval: 1440,
      outputFormat: format,
      mergeStrategy: "lowest_price",
      schedule: 24,
      dealerId,
      tenantScope: "DEALER",
      ownerType: "DEALER",
    },
    update: {
      name,
      channel: "marketplace",
      status: "active",
      outputFormat: format,
      dealerId,
      tenantScope: "DEALER",
      ownerType: "DEALER",
    },
  });
}

async function pauseNonErsaFeeds(dealerId: string, ersaSourceIds: Set<string>) {
  const feeds = await prisma.thyronixFeed.findMany({ where: { dealerId } });
  let paused = 0;
  for (const feed of feeds) {
    if (!feed.sourceId) continue;
    if (ersaSourceIds.has(feed.sourceId)) continue;
    await prisma.thyronixFeed.update({
      where: { id: feed.id },
      data: { status: "paused" },
    });
    paused++;
  }
  return paused;
}

async function publishFeedWithSources(feedId: string, sourceIds: string[]) {
  const feed = await prisma.thyronixFeed.findUnique({ where: { id: feedId } });
  if (!feed) return null;

  const { products, filterStats } = await loadMergedFeedProductsForOutput(feed, sourceIds);
  if (products.length === 0) {
    await prisma.thyronixFeed.update({
      where: { id: feedId },
      data: { productCount: 0, lastPublished: new Date() },
    });
    return { feed, productCount: 0, parts: 0, filterStats };
  }

  const warmed = await warmFeedXmlCache(feedId, sourceIds.length ? { sourceIds } : undefined);
  return {
    feed,
    productCount: warmed.productCount,
    parts: warmed.plan.partCount,
    filterStats,
  };
}

async function publishFeed(feedId: string) {
  const feed = await prisma.thyronixFeed.findUnique({ where: { id: feedId } });
  if (!feed) return null;

  const sourceIds = await resolveFeedSourceIds(feed);
  const { products, filterStats } = await loadMergedFeedProductsForOutput(feed, sourceIds);

  if (products.length === 0) {
    await prisma.thyronixFeed.update({
      where: { id: feedId },
      data: { productCount: 0, lastPublished: new Date() },
    });
    return { feed, productCount: 0, parts: 0, filterStats };
  }

  const warmed = await warmFeedXmlCache(feedId, sourceIds.length ? { sourceIds } : undefined);
  return {
    feed,
    productCount: warmed.productCount,
    parts: warmed.plan.partCount,
    filterStats,
  };
}

async function main() {
  const doSync = process.argv.includes("--sync");

  await prisma.$connect();
  const dealerId = await resolveVhtTargetDealerId();
  if (!dealerId) {
    console.error("✗ Hedef bayi bulunamadı");
    process.exit(1);
  }

  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  console.log(`=== Ersa Feed Provision — ${dealer?.name || dealerId} ===\n`);

  console.log("1/4 Kurallar");
  await seedRules(dealerId);
  console.log("✓\n");

  if (doSync) {
    console.log("2/4 Kaynak sync");
    const seed = await seedErsaGuduPackage({ sync: true });
    for (const r of seed.results) {
      console.log(r.error ? `✗ ${r.code}: ${r.error}` : `✓ ${r.code}${r.count != null ? ` — ${r.count} ürün` : ""}`);
    }
    console.log("");
  } else {
    console.log("2/4 Kaynak sync — atlandı (--sync ile çalıştırın)\n");
  }

  console.log("3/4 Firma feed kayıtları");
  const ersaSourceIds = new Set<string>();
  const feedRows: Array<{ code: string; feedId: string; name: string }> = [];

  for (const code of ERSA_GUDU_VHT_CODES) {
    if (code === "VHT39" || SKIP_SYNC.has(code)) continue;
    const source = await findErsaSource(dealerId, code);
    if (!source) {
      console.log(`✗ ${code} — kaynak yok`);
      continue;
    }
    ersaSourceIds.add(source.id);
    const feed = await upsertErsaSourceFeed(dealerId, code, source);
    feedRows.push({ code, feedId: feed.id, name: feed.name });
    console.log(`✓ ${feed.name} (${source.productCount.toLocaleString("tr-TR")} kaynak ürün)`);
  }

  const combined = await ensureCombinedOutputFeed(dealerId);
  await prisma.thyronixFeed.update({
    where: { id: combined.id },
    data: { name: "Esra'nın Dünyası — Birleşik XML", status: "active" },
  });
  feedRows.push({ code: "BIRLEŞIK", feedId: combined.id, name: combined.name });
  console.log(`✓ ${combined.name}`);

  const paused = await pauseNonErsaFeeds(dealerId, ersaSourceIds);
  if (paused) console.log(`· ${paused} eski feed duraklatıldı`);
  console.log("");

  console.log("4/4 Çıktı XML yayın (kurallar uygulanır)");
  const summary: Array<{
    name: string;
    output: number;
    parts: number;
    gate: number;
    stock: number;
    error?: string;
  }> = [];

  const ersaIds = [...ersaSourceIds];

  for (const row of feedRows) {
    try {
      const result =
        row.code === "BIRLEŞIK"
          ? await publishFeedWithSources(row.feedId, ersaIds)
          : await publishFeed(row.feedId);
      if (!result) {
        summary.push({ name: row.name, output: 0, parts: 0, gate: 0, stock: 0, error: "feed yok" });
        console.log(`✗ ${row.name}`);
        continue;
      }
      const st = result.filterStats;
      summary.push({
        name: row.name,
        output: result.productCount,
        parts: result.parts,
        gate: st?.hiddenByGate || 0,
        stock: st?.hiddenByStock || 0,
      });
      console.log(
        `✓ ${row.name} — ${result.productCount.toLocaleString("tr-TR")} çıktı` +
          (result.parts > 1 ? ` (${result.parts} parça)` : "") +
          (st && (st.hiddenByGate > 0 || st.hiddenByStock > 0)
            ? ` · gate:${st.hiddenByGate} stok:${st.hiddenByStock}`
            : ""),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.push({ name: row.name, output: 0, parts: 0, gate: 0, stock: 0, error: msg });
      console.log(`✗ ${row.name} — ${msg.slice(0, 120)}`);
    }
  }

  console.log("\n=== Özet ===");
  const ok = summary.filter((s) => s.output > 0).length;
  console.log(`Çıktılı feed: ${ok}/${summary.length}`);
  console.log(`Panel: /thyronix/feeds`);
  process.exit(ok === 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
