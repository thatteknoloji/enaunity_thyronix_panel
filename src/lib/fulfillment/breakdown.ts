export function getCostBreakdown(costItems: { type: string; title: string; amount: number }[]) {
  const map: Record<string, number> = {};
  for (const c of costItems) {
    map[c.type] = (map[c.type] || 0) + c.amount;
  }
  return {
    productCost: map.PRODUCT_COST || 0,
    shippingCost: map.SHIPPING_COST || 0,
    packagingCost: map.PACKAGING_COST || 0,
    serviceCost: map.SERVICE_COST || 0,
    adjustment: map.ADJUSTMENT || 0,
    total: Object.values(map).reduce((a, b) => a + b, 0),
  };
}
