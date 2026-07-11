import { listProductGraphs } from "./product-graph";

/** Dropship-eligible products from Product Engine graph */
export function listDropshipProductCodes(): string[] {
  return listProductGraphs()
    .filter((g) => g.identity.isDropship)
    .map((g) => g.identity.productCode);
}

export function isDropshipProductCode(productCode: string): boolean {
  return listProductGraphs().some(
    (g) => g.identity.productCode === productCode && g.identity.isDropship
  );
}

export function isDropshipCategory(category: string): boolean {
  return listProductGraphs().some(
    (g) => g.identity.category === category && g.identity.isDropship
  );
}

export function listDropshipCategories(): string[] {
  return [
    ...new Set(
      listProductGraphs()
        .filter((g) => g.identity.isDropship)
        .map((g) => g.identity.category)
    ),
  ];
}
