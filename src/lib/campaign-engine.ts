import { prisma } from "./db";

interface CampaignResult {
  campaign: any;
  discount: number;
  label: string;
}

export async function getActiveCampaigns() {
  const now = new Date();
  return prisma.campaign.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    include: { products: { select: { productId: true, type: true } } },
  });
}

function checkTarget(c: { targetType: string; targetIds: string }, dealerGroup?: string, dealerId?: string, userId?: string): boolean {
  if (c.targetType === "all" || !c.targetType) return true;

  const ids: string[] = (() => {
    try { return JSON.parse(c.targetIds); } catch { return []; }
  })();

  const types = c.targetType.split(",").map(s => s.trim());

  for (const t of types) {
    if (t === "all") return true;
    if (t === "dealerGroups" && dealerGroup && ids.includes(dealerGroup)) return true;
    if (t === "dealers" && dealerId && ids.includes(dealerId)) return true;
    if (t === "users" && userId && ids.includes(userId)) return true;
  }

  return false;
}

export async function applyCampaigns(
  cartItems: Array<{ productId: string; quantity: number; price: number }>,
  cartTotal: number,
  dealerGroup?: string,
  dealerId?: string,
  userId?: string,
  orderCount?: number,
): Promise<CampaignResult[]> {
  const campaigns = await getActiveCampaigns();
  const results: CampaignResult[] = [];

  const allProductIds = cartItems.map(i => i.productId);
  const allProducts = allProductIds.length > 0 ? await prisma.product.findMany({
    where: { id: { in: allProductIds } },
    select: { id: true, category: true },
  }) : [];
  const productCategoryMap = new Map(allProducts.map(p => [p.id, p.category]));

  for (const c of campaigns) {
    let discount = 0;
    let applies = false;
    let label = c.badge || c.name;

    // Audience targeting check
    if (!checkTarget(c, dealerGroup, dealerId, userId)) continue;

    if (c.minAmount > 0 && cartTotal < c.minAmount) continue;
    if (c.orderCountMin > 0 && (!orderCount || orderCount < c.orderCountMin)) continue;

    const buyIds = c.products.filter(p => p.type === "buy").map(p => p.productId);
    const getIds = c.products.filter(p => p.type === "get").map(p => p.productId);

    switch (c.type) {
      case "quantity_discount": {
        if (buyIds.length > 0) {
          for (const item of cartItems) {
            if (buyIds.includes(item.productId) && item.quantity >= c.minQuantity) {
              applies = true;
              if (c.discountType === "percentage") {
                discount = item.price * item.quantity * (c.discountValue / 100);
              } else {
                discount = c.discountValue * item.quantity;
              }
              break;
            }
          }
        } else {
          const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);
          if (totalQty >= c.minQuantity) {
            applies = true;
            discount = c.discountType === "percentage" ? cartTotal * (c.discountValue / 100) : c.discountValue;
          }
        }
        break;
      }

      case "bogo": {
        const hasBuy = buyIds.length === 0 || cartItems.some(i => buyIds.includes(i.productId));
        const hasGet = getIds.length > 0;
        if (hasBuy && hasGet) {
          applies = true;
          const getItems = cartItems.filter(i => getIds.includes(i.productId));
          for (const item of getItems) {
            if (c.discountType === "percentage") {
              discount += item.price * item.quantity * (c.discountValue / 100);
            } else {
              discount += Math.min(c.discountValue * item.quantity, item.price * item.quantity);
            }
          }
          label = c.badge || `${getIds.length} ürüne özel`;
        }
        break;
      }

      case "bundle": {
        const matchingItems = cartItems.filter(i => c.products.some(p => p.productId === i.productId));
        if (matchingItems.length >= c.products.length) {
          applies = true;
          const normalTotal = matchingItems.reduce((s, i) => s + i.price * i.quantity, 0);
          discount = Math.max(0, normalTotal - c.bundlePrice);
          label = c.badge || `Paket fiyatı: ${c.bundlePrice} ₺`;
        }
        break;
      }

      case "free_shipping": {
        applies = true;
        label = c.badge || "Kargo Bedava";
        break;
      }

      case "category_discount": {
        let catScope: string[] = [];
        try { catScope = JSON.parse(c.categoryScope || "[]"); } catch {}
        if (catScope.length > 0) {
          const catItems = cartItems.filter(i => catScope.includes(productCategoryMap.get(i.productId) || ""));
          if (catItems.length > 0) {
            applies = true;
            const subtotal = catItems.reduce((s, i) => s + i.price * i.quantity, 0);
            discount = c.discountType === "percentage" ? subtotal * (c.discountValue / 100) : c.discountValue;
          }
        }
        break;
      }

      case "first_order": {
        if (!orderCount || orderCount === 0) {
          applies = true;
          discount = c.discountType === "percentage" ? cartTotal * (c.discountValue / 100) : c.discountValue;
          label = c.badge || "İlk Sipariş İndirimi";
        }
        break;
      }

      case "loyalty": {
        if (orderCount && orderCount >= c.orderCountMin) {
          applies = true;
          discount = c.discountType === "percentage" ? cartTotal * (c.discountValue / 100) : c.discountValue;
          label = c.badge || "Sadakat İndirimi";
        }
        break;
      }
    }

    if (c.maxDiscount > 0 && discount > c.maxDiscount) discount = c.maxDiscount;

    if (applies) {
      results.push({ campaign: { id: c.id, name: c.name, type: c.type, freeShipping: c.freeShipping }, discount, label });
    }
  }

  return results;
}
