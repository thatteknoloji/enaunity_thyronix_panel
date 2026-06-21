/**
 * Product Showcase CMS tests
 * Run: npm run test:ecosystem-showcase
 */
import { prisma } from "../src/lib/db";
import {
  createShowcase,
  listShowcaseProducts,
  reorderShowcase,
  updateShowcase,
} from "../src/lib/ecosystem/service";
import { ensureDefaultShowcaseProducts, syncBuiltInShowcaseProducts } from "../src/lib/ecosystem/seed-defaults";
import { parseFeatures, serializeFeatures } from "../src/lib/ecosystem/parse";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

async function main() {
  console.log("\n=== Product Showcase CMS Tests ===\n");

  console.log("1) Feature JSON round-trip");
  const raw = serializeFeatures(["Chip A", "Chip B"], [{ title: "Feature 1", description: "Desc" }]);
  const parsed = parseFeatures(raw);
  assert(parsed.cardFeatures.length === 2, "Card chips preserved");
  assert(parsed.features.length === 1, "Landing features preserved");

  console.log("\n2) Default seed products");
  await ensureDefaultShowcaseProducts();
  await syncBuiltInShowcaseProducts();
  const all = await listShowcaseProducts({ admin: true });
  assert(all.length >= 4, "At least 4 default products (ENA, THYRONIX, HIVE, LinkSlash)");
  assert(all.some((p) => p.slug === "thyronix"), "THYRONIX seeded");
  assert(all.some((p) => p.slug === "hive"), "HIVE seeded");
  assert(all.some((p) => p.slug === "linkslash"), "LinkSlash seeded");

  console.log("\n3) Public list filter");
  const publicList = await listShowcaseProducts();
  assert(publicList.every((p) => ["ACTIVE", "COMING_SOON"].includes(p.status)), "Public only active/coming soon");

  console.log("\n4) Create + reorder");
  const created = await createShowcase({
    name: "KAIROS Test",
    slug: `kairos-test-${Date.now()}`,
    status: "HIDDEN",
    cardFeatures: ["Test Chip"],
    badgeText: "NEW",
  });
  assert(created.name === "KAIROS Test", "Product created");

  const reordered = await reorderShowcase([created.id, ...all.map((p) => p.id)]);
  assert(reordered[0]?.id === created.id, "Reorder puts new item first");

  await updateShowcase(created.id, { status: "ACTIVE", shortDescription: "Updated" });
  const row = await prisma.productShowcase.findUnique({ where: { id: created.id } });
  assert(row?.status === "ACTIVE", "Status update works");
  assert(row?.shortDescription === "Updated", "Field update works");

  await prisma.productShowcase.delete({ where: { id: created.id } });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
