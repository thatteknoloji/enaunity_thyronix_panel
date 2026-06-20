export type DealerProductVariant = {
  label: string;
  sku?: string;
  price?: number;
};

export function parseVariants(json: string): DealerProductVariant[] {
  try {
    const arr = JSON.parse(json || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
