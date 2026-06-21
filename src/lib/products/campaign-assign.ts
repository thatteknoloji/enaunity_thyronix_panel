import { prisma } from "@/lib/db";

/** Ürünün kampanya bağlantılarını günceller (buy tipi) */
export async function syncProductCampaigns(productId: string, campaignIds: string[]) {
  const unique = [...new Set(campaignIds.filter(Boolean))];
  await prisma.campaignProduct.deleteMany({
    where: { productId, type: "buy" },
  });
  if (unique.length === 0) return;
  await prisma.campaignProduct.createMany({
    data: unique.map((campaignId) => ({
      campaignId,
      productId,
      type: "buy",
      quantity: 1,
    })),
  });
}

/** Seçili ürünlere kampanya ekler veya kaldırır */
export async function bulkAssignCampaigns(
  productIds: string[],
  campaignId: string,
  mode: "add" | "remove" | "replace"
) {
  if (!campaignId) return 0;
  let updated = 0;
  for (const productId of productIds) {
    if (mode === "remove") {
      await prisma.campaignProduct.deleteMany({
        where: { productId, campaignId, type: "buy" },
      });
      updated++;
      continue;
    }
    if (mode === "replace") {
      await prisma.campaignProduct.deleteMany({ where: { productId, type: "buy" } });
    }
    await prisma.campaignProduct.upsert({
      where: {
        campaignId_type_productId: { campaignId, type: "buy", productId },
      },
      create: { campaignId, productId, type: "buy", quantity: 1 },
      update: {},
    });
    updated++;
  }
  return updated;
}
