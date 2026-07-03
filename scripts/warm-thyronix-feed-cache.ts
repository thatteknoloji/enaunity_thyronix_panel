import { prisma } from "../src/lib/db";
import { warmFeedXmlCache } from "../src/lib/thyronix/feed-cache-warm";

async function main() {
  const feedId = process.argv[2];
  if (!feedId) {
    console.error("Kullanim: npx tsx scripts/warm-thyronix-feed-cache.ts <feedId>");
    process.exit(1);
  }

  const result = await warmFeedXmlCache(feedId);
  result.plan.parts.forEach((part, index) => {
    console.log(`✓ part ${part.part}/${result.plan.partCount} → ${part.productCount} ürün → ${result.paths[index]}`);
  });

  console.log(
    JSON.stringify(
      {
        feedId: result.feedId,
        productCount: result.productCount,
        partCount: result.plan.partCount,
        summary: result.plan.summaryTr,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
