import { prisma } from "../src/lib/db";

async function main() {
  const products = await prisma.product.findMany({ take: 10 });

  const campaigns = [
    {
      name: "Haftanın Fırsatı",
      description: "Seçili ürünlerde %20 indirim",
      type: "quantity_discount",
      discountType: "percentage",
      discountValue: 20,
      minQuantity: 1,
      active: true,
      badge: "Haftanın Fırsatı",
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      name: "2 Al 1 Öde",
      description: "Aynı üründen 2 alana 1 bedava",
      type: "bogo",
      discountType: "percentage",
      discountValue: 100,
      minQuantity: 2,
      active: true,
      badge: "2 Al 1 Öde",
      endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      name: "Kategori İndirimi",
      description: "Tüm Halı ve Kilimlerde %15 indirim",
      type: "category_discount",
      discountType: "percentage",
      discountValue: 15,
      targetCategory: "Halı",
      minAmount: 0,
      active: true,
      badge: "%15 İndirim",
      endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const c of campaigns) {
    const created = await prisma.campaign.create({ data: c });
    if (c.type !== "category_discount") {
      for (const p of products) {
        await prisma.campaignProduct.create({
          data: { campaignId: created.id, productId: p.id, type: "buy", quantity: 1 },
        });
      }
    }
    console.log(`Created campaign: ${created.name} (${created.id})`);
  }

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
