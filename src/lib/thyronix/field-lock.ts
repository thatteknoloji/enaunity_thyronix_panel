export type ThyronixFieldLocks = Record<string, boolean>;

/** Bayi düzenlediğinde otomatik kilitlenen içerik alanları */
export const THYRONIX_CONTENT_LOCK_FIELDS = [
  "name",
  "description",
  "image",
  "images",
  "brand",
  "category",
  "variantData",
  "manufacturer",
  "warranty",
  "deliveryTime",
  "productUrl",
  "dimensions",
  "weight",
] as const;

/** Sync ile güncellenen alanlar (kilit yoksa) */
export const THYRONIX_SYNC_FIELDS = [
  "price",
  "stock",
  "costPrice",
  "discountedPrice",
  "currency",
  "vatRate",
  "shippingCost",
  "status",
] as const;

export const THYRONIX_IDENTITY_FIELDS = [
  "barcode",
  "stockCode",
  "modelCode",
  "externalId",
] as const;

export const THYRONIX_AUTO_LOCK_FIELDS = THYRONIX_CONTENT_LOCK_FIELDS;

export function parseFieldLocks(raw?: string | null): ThyronixFieldLocks {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => v === true).map(([k]) => [k, true]),
    );
  } catch {
    return {};
  }
}

export function serializeFieldLocks(locks: ThyronixFieldLocks): string {
  return JSON.stringify(locks);
}

export function mergeFieldLocks(existing: ThyronixFieldLocks, patch: ThyronixFieldLocks): ThyronixFieldLocks {
  return { ...existing, ...patch };
}

export function detectChangedLocks<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: readonly string[],
): ThyronixFieldLocks {
  const locks: ThyronixFieldLocks = {};
  for (const field of fields) {
    const prev = before[field];
    const next = after[field];
    if (JSON.stringify(prev ?? "") !== JSON.stringify(next ?? "")) {
      locks[field] = true;
    }
  }
  return locks;
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 0.0001;
  }
  return String(a ?? "") === String(b ?? "");
}

export type ThyronixProductSnapshot = {
  name: string;
  description: string | null;
  image: string | null;
  images: string | null;
  brand: string | null;
  category: string | null;
  variantData: string | null;
  manufacturer: string | null;
  warranty: string | null;
  deliveryTime: string | null;
  productUrl: string | null;
  dimensions: string | null;
  weight: number | null;
  price: number;
  stock: number;
  costPrice: number | null;
  discountedPrice: number | null;
  currency: string;
  vatRate: number | null;
  shippingCost: number | null;
  status: string;
  barcode: string | null;
  stockCode: string | null;
  modelCode: string | null;
  externalId: string;
};

export function snapshotThyronixProduct(product: Record<string, unknown>): ThyronixProductSnapshot {
  return {
    name: String(product.name ?? ""),
    description: product.description != null ? String(product.description) : null,
    image: product.image != null ? String(product.image) : null,
    images: product.images != null ? String(product.images) : null,
    brand: product.brand != null ? String(product.brand) : null,
    category: product.category != null ? String(product.category) : null,
    variantData: product.variantData != null ? String(product.variantData) : null,
    manufacturer: product.manufacturer != null ? String(product.manufacturer) : null,
    warranty: product.warranty != null ? String(product.warranty) : null,
    deliveryTime: product.deliveryTime != null ? String(product.deliveryTime) : null,
    productUrl: product.productUrl != null ? String(product.productUrl) : null,
    dimensions: product.dimensions != null ? String(product.dimensions) : null,
    weight: product.weight != null ? Number(product.weight) : null,
    price: Number(product.price) || 0,
    stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
    costPrice: product.costPrice != null ? Number(product.costPrice) : null,
    discountedPrice: product.discountedPrice != null ? Number(product.discountedPrice) : null,
    currency: String(product.currency ?? "TRY"),
    vatRate: product.vatRate != null ? Number(product.vatRate) : null,
    shippingCost: product.shippingCost != null ? Number(product.shippingCost) : null,
    status: String(product.status ?? "active"),
    barcode: product.barcode != null ? String(product.barcode) : null,
    stockCode: product.stockCode != null ? String(product.stockCode) : null,
    modelCode: product.modelCode != null ? String(product.modelCode) : null,
    externalId: String(product.externalId ?? ""),
  };
}

export function buildMergedUpdate(
  existing: ThyronixProductSnapshot & { lockedFields?: string | null; status: string },
  incoming: Partial<ThyronixProductSnapshot>,
): { update: Record<string, unknown>; changed: boolean } {
  const locks = parseFieldLocks(existing.lockedFields);
  const update: Record<string, unknown> = {};
  let changed = false;

  const tryField = (field: string, inc: unknown, ex: unknown) => {
    if (locks[field]) return;
    if (valuesEqual(ex, inc)) return;
    update[field] = inc;
    changed = true;
  };

  for (const field of THYRONIX_CONTENT_LOCK_FIELDS) {
    if (field in incoming) tryField(field, incoming[field as keyof ThyronixProductSnapshot], existing[field as keyof ThyronixProductSnapshot]);
  }
  for (const field of THYRONIX_SYNC_FIELDS) {
    if (field in incoming) tryField(field, incoming[field as keyof ThyronixProductSnapshot], existing[field as keyof ThyronixProductSnapshot]);
  }
  for (const field of THYRONIX_IDENTITY_FIELDS) {
    if (field in incoming) tryField(field, incoming[field as keyof ThyronixProductSnapshot], existing[field as keyof ThyronixProductSnapshot]);
  }

  if (existing.status === "missing_from_source" && incoming.status !== "missing_from_source") {
    update.status = incoming.status ?? "active";
    changed = true;
  }

  return { update, changed };
}

export async function applyThyronixFieldLocksAfterEdit(
  productId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  const patch = detectChangedLocks(
    snapshotThyronixProduct(before) as unknown as Record<string, unknown>,
    snapshotThyronixProduct(after) as unknown as Record<string, unknown>,
    THYRONIX_AUTO_LOCK_FIELDS,
  );
  if (!Object.keys(patch).length) return;

  const existing = parseFieldLocks(typeof after.lockedFields === "string" ? after.lockedFields : null);
  const merged = mergeFieldLocks(existing, patch);
  const { prisma } = await import("@/lib/db");
  await prisma.thyronixProduct.update({
    where: { id: productId },
    data: { lockedFields: serializeFieldLocks(merged) },
  });
}
