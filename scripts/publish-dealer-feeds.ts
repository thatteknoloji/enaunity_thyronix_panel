/**
 * Bayi feed'lerini oluşturur / günceller ve kurallarla yeniden yayınlar.
 * Run: npx tsx scripts/publish-dealer-feeds.ts
 *      npx tsx scripts/publish-dealer-feeds.ts --dealer-id=<id>
 */
import { prisma } from "../src/lib/db";
import { resolveVhtTargetDealerId } from "../src/lib/thyronix/connectors/vht-seed-service";
import {
  ensureCombinedOutputFeed,
  provisionAndPublishOutputs,
} from "./setup-ersa-gudu-helpers";

async function dedupeCombinedFeeds(dealerId: string) {
  const combined = await prisma.thyronixFeed.findMany({
    where: { dealerId, sourceId: null },
    orderBy: [{ productCount: "desc" }, { createdAt: "asc" }],
  });
  if (combined.length <= 1) return combined[0] || null;

  const [primary, ...rest] = combined;
  for (const feed of rest) {
    await prisma.thyronixFeed.update({
      where: { id: feed.id },
      data: { status: "paused", name: `${feed.name} (eski)` },
    });
    console.log(`· Duraklatıldı (yinelenen birleşik): ${feed.name}`);
  }
  return primary;
}

async function main() {
  const dealerArg = process.argv.find((a) => a.startsWith("--dealer-id="))?.split("=")[1];
  const dealerId = dealerArg || (await resolveVhtTargetDealerId());
  if (!dealerId) {
    console.error("Hedef bayi bulunamadı");
    process.exit(1);
  }

  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  console.log(`=== Feed yayın — ${dealer?.name || dealerId} ===\n`);

  const primary = await dedupeCombinedFeeds(dealerId);
  const combined = await ensureCombinedOutputFeed(dealerId);
  const ws = await prisma.thyronixWorkspaceSettings.findFirst({ where: { dealerId } });
  let brand = "";
  if (ws) {
    try {
      const automation = JSON.parse(ws.automationJson || "{}") as {
        feedTransform?: { targetBrand?: string };
      };
      brand = String(automation.feedTransform?.targetBrand || "").trim();
    } catch {
      /* ignore */
    }
  }
  const combinedName = brand ? `${brand} — Birleşik XML` : "Birleşik XML — Tüm Kaynaklar";
  await prisma.thyronixFeed.update({
    where: { id: combined.id },
    data: {
      name: combinedName,
      status: "active",
      channel: "marketplace",
    },
  });
  if (primary && primary.id !== combined.id) {
    console.log(`· Birincil birleşik feed: ${combinedName}`);
  } else {
    console.log(`✓ Birleşik feed: ${combinedName}`);
  }

  await provisionAndPublishOutputs(dealerId);

  const feeds = await prisma.thyronixFeed.findMany({
    where: { dealerId, status: "active" },
    select: { id: true, name: true, sourceId: true, productCount: true },
    orderBy: [{ sourceId: "asc" }, { name: "asc" }],
  });
  const combinedActive = feeds.filter((f) => !f.sourceId);
  const perSource = feeds.filter((f) => f.sourceId);

  console.log("\n=== Özet ===");
  console.log(`Birleşik feed: ${combinedActive.length}`);
  combinedActive.forEach((f) =>
    console.log(`  · ${f.name} — ${f.productCount.toLocaleString("tr-TR")} ürün`),
  );
  console.log(`Kaynak bazlı feed: ${perSource.length}`);
  perSource.forEach((f) =>
    console.log(`  · ${f.name} — ${f.productCount.toLocaleString("tr-TR")} ürün`),
  );
  console.log("\nPanel: /thyronix/feeds");
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("publish-dealer-feeds.ts");

if (isDirectRun) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
