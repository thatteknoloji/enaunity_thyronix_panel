export type DuplicateMergeProduct = {
  id: string;
  sourceId?: string | null;
  name?: string | null;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  barcode?: string | null;
  stockCode?: string | null;
  modelCode?: string | null;
  externalId?: string | null;
  price?: number | null;
  discountedPrice?: number | null;
  costPrice?: number | null;
  stock?: number | null;
  image?: string | null;
  images?: string | null;
  weight?: number | null;
  dimensions?: string | null;
  vatRate?: number | null;
  deliveryTime?: string | null;
  manufacturer?: string | null;
  warranty?: string | null;
  shippingCost?: number | null;
  productUrl?: string | null;
  currency?: string | null;
  status?: string | null;
  metadataJson?: string | null;
  createdAt?: string | Date | null;
  source?: { id?: string; name?: string | null } | null;
};

export type DuplicateMergeFieldChange = {
  field: string;
  label: string;
  from: string;
  to: string;
};

function normalizeText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function pickLongestText(products: DuplicateMergeProduct[], field: keyof DuplicateMergeProduct) {
  const candidates = products
    .map((product) => normalizeText(product[field]))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  return candidates[0] || "";
}

function pickFirstText(products: DuplicateMergeProduct[], field: keyof DuplicateMergeProduct) {
  return products.map((product) => normalizeText(product[field])).find(Boolean) || "";
}

function pickPositiveNumber(products: DuplicateMergeProduct[], field: keyof DuplicateMergeProduct) {
  const values = products
    .map((product) => Number(product[field]))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? values[0] : null;
}

function pickMaxNumber(products: DuplicateMergeProduct[], field: keyof DuplicateMergeProduct) {
  const values = products
    .map((product) => Number(product[field]))
    .filter((value) => Number.isFinite(value));
  return values.length ? Math.max(...values) : null;
}

function uniqueImageList(products: DuplicateMergeProduct[]) {
  const seen = new Set<string>();
  for (const product of products) {
    const values = [
      normalizeText(product.image),
      ...normalizeText(product.images)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ];
    for (const value of values) {
      if (value) seen.add(value);
    }
  }
  return [...seen];
}

function parseMetadata(value: string | null | undefined) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    name: "Ürün adı",
    description: "Açıklama",
    brand: "Marka",
    category: "Kategori",
    barcode: "Barkod",
    stockCode: "Stok kodu",
    modelCode: "Model kodu",
    externalId: "Harici ID",
    price: "Fiyat",
    discountedPrice: "İndirimli fiyat",
    costPrice: "Maliyet",
    stock: "Stok",
    image: "Ana görsel",
    images: "Görsel listesi",
    weight: "Ağırlık",
    dimensions: "Ebat",
    vatRate: "KDV",
    deliveryTime: "Teslim süresi",
    manufacturer: "Üretici",
    warranty: "Garanti",
    shippingCost: "Kargo",
    productUrl: "Ürün linki",
    currency: "Para birimi",
    status: "Durum",
  };
  return labels[field] || field;
}

export function buildDuplicateMergePlan(products: DuplicateMergeProduct[], masterId: string) {
  const master = products.find((product) => product.id === masterId);
  if (!master) {
    throw new Error("Master kayıt bulunamadı");
  }

  const duplicates = products.filter((product) => product.id !== masterId);
  const all = [master, ...duplicates];
  const images = uniqueImageList(all);

  const merged = {
    name: normalizeText(master.name) || pickLongestText(all, "name") || null,
    description: normalizeText(master.description) || pickLongestText(all, "description") || null,
    brand: normalizeText(master.brand) || pickFirstText(all, "brand") || null,
    category: normalizeText(master.category) || pickFirstText(all, "category") || null,
    barcode: normalizeText(master.barcode) || pickFirstText(all, "barcode") || null,
    stockCode: normalizeText(master.stockCode) || pickFirstText(all, "stockCode") || null,
    modelCode: normalizeText(master.modelCode) || pickFirstText(all, "modelCode") || null,
    externalId: normalizeText(master.externalId) || pickFirstText(all, "externalId") || null,
    price: Number(master.price) > 0 ? Number(master.price) : pickPositiveNumber(all, "price") ?? 0,
    discountedPrice: Number(master.discountedPrice) > 0 ? Number(master.discountedPrice) : pickPositiveNumber(all, "discountedPrice"),
    costPrice: Number(master.costPrice) > 0 ? Number(master.costPrice) : pickPositiveNumber(all, "costPrice"),
    stock: pickMaxNumber(all, "stock") ?? Number(master.stock || 0),
    image: normalizeText(master.image) || images[0] || null,
    images: images.length ? images.join(",") : null,
    weight: Number(master.weight) > 0 ? Number(master.weight) : pickPositiveNumber(all, "weight"),
    dimensions: normalizeText(master.dimensions) || pickFirstText(all, "dimensions") || null,
    vatRate: Number(master.vatRate) > 0 ? Number(master.vatRate) : pickPositiveNumber(all, "vatRate"),
    deliveryTime: normalizeText(master.deliveryTime) || pickFirstText(all, "deliveryTime") || null,
    manufacturer: normalizeText(master.manufacturer) || pickFirstText(all, "manufacturer") || null,
    warranty: normalizeText(master.warranty) || pickFirstText(all, "warranty") || null,
    shippingCost: Number(master.shippingCost) > 0 ? Number(master.shippingCost) : pickPositiveNumber(all, "shippingCost"),
    productUrl: normalizeText(master.productUrl) || pickFirstText(all, "productUrl") || null,
    currency: normalizeText(master.currency) || pickFirstText(all, "currency") || "TRY",
    status: master.status === "active" || all.some((product) => product.status === "active") ? "active" : (master.status || "active"),
  } satisfies Record<string, unknown>;

  const changedFields: DuplicateMergeFieldChange[] = Object.entries(merged)
    .map(([field, nextValue]) => {
      const before = master[field as keyof DuplicateMergeProduct];
      const beforeText = before == null ? "" : String(before);
      const nextText = nextValue == null ? "" : String(nextValue);
      if (beforeText === nextText) return null;
      return {
        field,
        label: fieldLabel(field),
        from: beforeText || "—",
        to: nextText || "—",
      };
    })
    .filter(Boolean) as DuplicateMergeFieldChange[];

  const masterMetadata = parseMetadata(master.metadataJson);
  const mergeMeta = {
    ...masterMetadata,
    duplicateMerge: {
      mergedAt: new Date().toISOString(),
      masterId,
      mergedIds: duplicates.map((product) => product.id),
      sourceIds: all.map((product) => product.sourceId || product.source?.id || product.id),
    },
  };

  return {
    masterId,
    duplicateIds: duplicates.map((product) => product.id),
    mergedData: {
      ...merged,
      metadataJson: JSON.stringify(mergeMeta),
    },
    changedFields,
    imageCount: images.length,
  };
}
