import { prisma } from "../src/lib/db";

const PLANS = [
  {
    moduleKey: "LINKSLASH",
    planKey: "starter",
    name: "Starter",
    description: "Bireysel link yönetimi",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    featuresJson: JSON.stringify(["WhatsApp import", "AI kategorizasyon", "IndexedDB yedek", "PWA"]),
    sortOrder: 1,
  },
  {
    moduleKey: "LINKSLASH",
    planKey: "pro",
    name: "Pro",
    description: "Yoğun kullanım ve agent",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    featuresJson: JSON.stringify(["Starter +", "Bulk AI agent", "Dead link kontrolü", "Bookmark import"]),
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
