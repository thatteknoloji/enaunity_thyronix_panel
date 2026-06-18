import { prisma } from "./db";

export async function getDealerPrice(
  productId: string, basePrice: number, dealerGroup: string,
  discountRate: number, quantity?: number, dealerId?: string
): Promise<number> {
  if (dealerId) {
    const dealerPrice = await prisma.dealerPrice.findUnique({
      where: { dealerId_productId: { dealerId, productId } },
    });
    if (dealerPrice) return dealerPrice.price;
  }
  if (quantity && quantity > 0) {
    const tier = await prisma.tieredPrice.findFirst({
      where: { productId, minQuantity: { lte: quantity } },
      orderBy: { minQuantity: "desc" },
    });
    if (tier) return tier.price;
  }
  const priceList = await prisma.priceList.findUnique({
    where: { group_productId: { group: dealerGroup, productId } },
  });
  if (priceList) return priceList.price;
  return basePrice * (1 - discountRate / 100);
}

export {
  getDealerBalance,
  checkDealerCredit,
  deductDealerBalance,
  addDealerBalance,
} from "@/lib/accounting/accounting-service";

export async function getDealerCatalog(productIds: string[], dealerGroup: string): Promise<Set<string>> {
  const restrictions = await prisma.catalogRestriction.findMany({
    where: { group: dealerGroup, productId: { in: productIds } },
    select: { productId: true },
  });
  const restrictedSet = new Set(restrictions.map((r) => r.productId));
  return new Set(productIds.filter((id) => !restrictedSet.has(id)));
}

export async function getDealerTotalSpent(dealerId: string): Promise<number> {
  const orders = await prisma.order.findMany({
    where: { dealerId, status: { not: "cancelled" } },
    select: { total: true },
  });
  return orders.reduce((sum, o) => sum + o.total, 0);
}
