import { prisma } from "../src/lib/db";

const PLANS = [
  {
    moduleKey: "AI_PAGE_FACTORY",
    planKey: "starter",
    name: "Page Factory Starter",
    description: "Sayfa evreni planlama — topology, cluster, blueprint",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    featuresJson: JSON.stringify(["5 proje", "Topology engine", "Cluster engine", "Blueprint şablonları"]),
    limitsJson: JSON.stringify({ maxProjects: 5, maxBlueprintsPerProject: 100, isPublic: true }),
    sortOrder: 1,
  },
  {
    moduleKey: "AI_PAGE_FACTORY",
    planKey: "pro",
    name: "Page Factory Pro",
    description: "Geniş ölçekli sayfa evreni planlama",
    monthlyPrice: 799,
    yearlyPrice: 7990,
    featuresJson: JSON.stringify(["50 proje", "GEO engine", "Page estimator", "Öncelikli destek"]),
    limitsJson: JSON.stringify({ maxProjects: 50, maxBlueprintsPerProject: 500, isPublic: true }),
    sortOrder: 2,
  },
];

async function main() {
  for (const plan of PLANS) {
    const existing = await prisma.modulePlan.findFirst({
      where: { moduleKey: plan.moduleKey, planKey: plan.planKey },
    });
    if (existing) {
      await prisma.modulePlan.update({ where: { id: existing.id }, data: plan });
      console.log(`  ✓ Plan güncellendi: ${plan.moduleKey}/${plan.planKey}`);
    } else {
      await prisma.modulePlan.create({ data: plan });
      console.log(`  ✓ Plan oluşturuldu: ${plan.moduleKey}/${plan.planKey}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
