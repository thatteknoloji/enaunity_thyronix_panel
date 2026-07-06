export const LOW_STOCK_THRESHOLD = 5;

export type VariantStockInput = {
  stock?: number | null;
  options?: string | Array<{ group: string; value: string }>;
};

export type StockStatusLevel = "out" | "low" | "in" | "partial";

export type ProductStockStatus = {
  level: StockStatusLevel;
  headline: string;
  headlineClass: string;
  quantityLabel: string | null;
  warnings: string[];
  totalStock: number;
  selectedStock: number;
  canPurchase: boolean;
  isLowStock: boolean;
};

function parseVariantOptions(
  options: VariantStockInput["options"],
): Array<{ group: string; value: string }> {
  if (Array.isArray(options)) return options.filter((o) => o.group && o.value);
  if (typeof options === "string" && options.trim()) {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed.filter((o) => o?.group && o?.value) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function formatVariantLabel(options: Array<{ group: string; value: string }>): string {
  if (!options.length) return "Varyant";
  if (options.length === 1) return options[0].value;
  return options.map((o) => o.value).join(" / ");
}

type NormalizedVariant = {
  stock: number;
  parsedOptions: Array<{ group: string; value: string }>;
};

function normalizeVariants(variants: VariantStockInput[]): NormalizedVariant[] {
  return variants.map((v) => ({
    stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
    parsedOptions: parseVariantOptions(v.options),
  }));
}

export function resolveProductStockStatus(input: {
  productStock: number;
  variants?: VariantStockInput[];
  selectedVariant?: VariantStockInput | null;
  backorderable?: boolean;
  lowStockThreshold?: number;
}): ProductStockStatus {
  const threshold = input.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
  const variants = normalizeVariants(input.variants || []);
  const hasVariants = variants.length > 0;

  const totalStock = hasVariants
    ? variants.reduce((sum, v) => sum + v.stock, 0)
    : Math.max(0, Math.floor(Number(input.productStock) || 0));

  const selectedStock = input.selectedVariant
    ? Math.max(0, Math.floor(Number(input.selectedVariant.stock) || 0))
    : totalStock;

  const warnings: string[] = [];

  if (hasVariants) {
    for (const variant of variants) {
      const label = formatVariantLabel(variant.parsedOptions);
      if (variant.stock <= 0) {
        warnings.push(`${label} varyantında stok yok`);
      } else if (variant.stock <= threshold) {
        warnings.push(`${label} varyantında düşük stok (${variant.stock} adet)`);
      }
    }
  }

  const allOut = totalStock <= 0;
  const someVariantsOut = hasVariants && variants.some((v) => v.stock <= 0) && totalStock > 0;
  const selectedOut = Boolean(input.selectedVariant) && selectedStock <= 0;

  let level: StockStatusLevel;
  let headline: string;
  let headlineClass: string;
  let quantityLabel: string | null = null;
  let isLowStock = false;

  if (selectedOut && !allOut) {
    const label = formatVariantLabel(parseVariantOptions(input.selectedVariant?.options));
    level = "out";
    headline = `${label} varyantında stok yok`;
    headlineClass = "text-ena-primary";
  } else if (allOut) {
    level = "out";
    headline = input.backorderable ? "Ön Sipariş" : "Ürün stokta yok";
    headlineClass = "text-ena-primary";
  } else if (someVariantsOut) {
    level = "partial";
    headline = "Stokta";
    headlineClass = "text-green-400";
    quantityLabel = `${totalStock} adet`;
  } else if (selectedStock > 0 && selectedStock <= threshold) {
    level = "low";
    headline = "Düşük stok";
    headlineClass = "text-yellow-400";
    quantityLabel = `${selectedStock} adet`;
    isLowStock = true;
  } else if (!hasVariants && totalStock <= threshold) {
    level = "low";
    headline = "Düşük stok";
    headlineClass = "text-yellow-400";
    quantityLabel = `${totalStock} adet`;
    isLowStock = true;
  } else {
    level = "in";
    headline = "Stokta";
    headlineClass = "text-green-400";
    quantityLabel = `${input.selectedVariant ? selectedStock : totalStock} adet`;
  }

  const canPurchase =
    selectedOut
      ? false
      : selectedStock > 0 || (input.backorderable ?? false);

  return {
    level,
    headline,
    headlineClass,
    quantityLabel,
    warnings,
    totalStock,
    selectedStock,
    canPurchase,
    isLowStock,
  };
}

export function resolveCatalogStockStatus(input: {
  productStock: number;
  variants?: VariantStockInput[];
  backorderable?: boolean;
}): ProductStockStatus {
  return resolveProductStockStatus({
    productStock: input.productStock,
    variants: input.variants,
    backorderable: input.backorderable,
  });
}
