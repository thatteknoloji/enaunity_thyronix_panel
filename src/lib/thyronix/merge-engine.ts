interface ThyronixProduct {
  id: string; name: string; barcode?: string | null; stockCode?: string | null;
  price: number; stock: number; deliveryTime?: string | null;
  sourceId?: string; mergeSourceIds?: string; mergeSelected?: boolean;
  [key: string]: unknown;
}

interface ThyronixVariant {
  id: string; productId?: string; barcode?: string; price?: number;
  stock: number; options: string;
}

export type MergeStrategy = "lowest_price" | "highest_stock" | "shortest_delivery" | "source_priority";

interface ProductGroup {
  key: string;
  products: ThyronixProduct[];
}

function getProductKey(p: ThyronixProduct): string {
  if (p.barcode) return `barcode:${p.barcode}`;
  if (p.stockCode) return `stockCode:${p.stockCode}`;
  return `name:${p.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

function groupProducts(products: ThyronixProduct[]): ProductGroup[] {
  const groups = new Map<string, ThyronixProduct[]>();
  for (const p of products) {
    const key = getProductKey(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return [...groups.values()].map(products => ({ key: getProductKey(products[0]), products }));
}

function selectByLowestPrice(group: ProductGroup): ThyronixProduct {
  const sorted = [...group.products].sort((a, b) => a.price - b.price);
  const winner = sorted[0];
  winner.mergeSourceIds = JSON.stringify(group.products.map(p => p.sourceId || p.id));
  return winner;
}

function selectByHighestStock(group: ProductGroup): ThyronixProduct {
  const sorted = [...group.products].sort((a, b) => b.stock - a.stock);
  const winner = sorted[0];
  winner.mergeSourceIds = JSON.stringify(group.products.map(p => p.sourceId || p.id));
  return winner;
}

function selectByShortestDelivery(group: ProductGroup): ThyronixProduct {
  function deliveryToMs(d: string | null | undefined): number {
    if (!d) return 999999;
    const num = parseInt(d);
    if (!isNaN(num)) return num;
    return 999999;
  }
  const sorted = [...group.products].sort((a, b) => deliveryToMs(a.deliveryTime) - deliveryToMs(b.deliveryTime));
  const winner = sorted[0];
  winner.mergeSourceIds = JSON.stringify(group.products.map(p => p.sourceId || p.id));
  return winner;
}

function selectBySourcePriority(group: ProductGroup, priorities: string[]): ThyronixProduct {
  const priorityMap = new Map(priorities.map((id, i) => [id, i]));
  const sorted = [...group.products].sort((a, b) => {
    const pa = priorityMap.get(a.sourceId || "") ?? 999;
    const pb = priorityMap.get(b.sourceId || "") ?? 999;
    return pa - pb;
  });
  const winner = sorted[0];
  winner.mergeSourceIds = JSON.stringify(group.products.map(p => p.sourceId || p.id));
  return winner;
}

export function mergeProducts(
  products: ThyronixProduct[],
  strategy: MergeStrategy,
  sourcePriorities: string[] = [],
): ThyronixProduct[] {
  const groups = groupProducts(products);
  const merged: ThyronixProduct[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    if (group.products.length === 1) {
      group.products[0].mergeSourceIds = JSON.stringify([group.products[0].sourceId || group.products[0].id]);
      merged.push(group.products[0]);
      seen.add(group.key);
      continue;
    }

    let winner: ThyronixProduct;
    switch (strategy) {
      case "lowest_price": winner = selectByLowestPrice(group); break;
      case "highest_stock": winner = selectByHighestStock(group); break;
      case "shortest_delivery": winner = selectByShortestDelivery(group); break;
      case "source_priority": winner = selectBySourcePriority(group, sourcePriorities); break;
      default: winner = selectByLowestPrice(group);
    }
    merged.push(winner);
    seen.add(group.key);
  }

  return merged;
}

export { getProductKey };
