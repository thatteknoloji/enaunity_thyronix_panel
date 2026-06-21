import { prisma } from "../src/lib/db";

const PLANS = [
  {
    moduleKey: "POD_CREATOR",
    planKey: "starter",
    name: "POD Starter",
    description: "Tasarımcı Modülü — başlangıç paketi",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    featuresJson: JSON.stringify(["10 tasarım", "100 mockup", "50 ürün", "Aylık faturalama"]),
    limitsJson: JSON.stringify({
      maxDesigns: 10,
      maxProducts: 50,
      maxMockups: 100,
      billingPeriod: "monthly",
      isPublic: true,
    }),
    sortOrder: 1,
  },
  {
    moduleKey: "POD_CREATOR",
    planKey: "pro",
    name: "POD Pro",
    description: "Tasarımdan ürüne — profesyonel paket",
    monthlyPrice: 499,
    yearlyPrice: 4990,
    featuresJson: JSON.stringify(["100 tasarım", "1000 mockup", "500 ürün", "Öncelikli destek"]),
    limitsJson: JSON.stringify({
      maxDesigns: 100,
      maxProducts: 500,
      maxMockups: 1000,
      billingPeriod: "monthly",
      isPublic: true,
    }),
    sortOrder: 2,
  },
  {
    moduleKey: "POD_CREATOR",
    planKey: "elite",
    name: "POD Elite",
    description: "Özel teklif — yalnızca admin ataması",
    monthlyPrice: 0,
    yearlyPrice: 0,
    featuresJson: JSON.stringify(["Özel limitler", "Admin ataması gerekli"]),
    limitsJson: JSON.stringify({
      maxDesigns: -1,
      maxProducts: -1,
      maxMockups: -1,
      billingPeriod: "monthly",
      isPublic: false,
      adminOnly: true,
    }),
    isActive: false,
    sortOrder: 3,
  },
];

async function main() {
  for (const plan of PLANS) {
    const { isActive, ...data } = plan as typeof plan & { isActive?: boolean };
    const existing = await prisma.modulePlan.findFirst({
      where: { moduleKey: plan.moduleKey, planKey: plan.planKey },
    });
    const payload = { ...data, isActive: isActive ?? true };
    if (existing) {
      await prisma.modulePlan.update({ where: { id: existing.id }, data: payload });
      console.log(`  ✓ Plan güncellendi: ${plan.moduleKey}/${plan.planKey}`);
    } else {
      await prisma.modulePlan.create({ data: payload });
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
