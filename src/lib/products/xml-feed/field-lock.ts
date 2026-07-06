import type { FieldLocks } from "./types";

export function parseFieldLocks(raw?: string | null): FieldLocks {
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

export function mergeFieldLocks(existing: FieldLocks, patch: FieldLocks): FieldLocks {
  return { ...existing, ...patch };
}

export function detectChangedLocks<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: readonly string[],
): FieldLocks {
  const locks: FieldLocks = {};
  for (const field of fields) {
    const prev = before[field];
    const next = after[field];
    if (JSON.stringify(prev ?? "") !== JSON.stringify(next ?? "")) {
      locks[field] = true;
    }
  }
  return locks;
}

export function pickUnlocked<T extends Record<string, unknown>>(
  incoming: T,
  existing: T,
  locks: FieldLocks,
): T {
  const out = { ...existing } as T;
  for (const [key, value] of Object.entries(incoming)) {
    if (locks[key]) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export function snapshotProductFields(product: {
  name: string;
  description: string;
  brand: string;
  price: number;
  category: string;
  subcategory: string;
  seoTitle?: string;
  seoDescription?: string;
  image?: string;
  images?: string;
  costPrice?: number;
  stock?: number;
}) {
  return {
    name: product.name,
    description: product.description,
    brand: product.brand,
    price: product.price,
    category: product.category,
    subcategory: product.subcategory,
    seoTitle: product.seoTitle || "",
    seoDescription: product.seoDescription || "",
    image: product.image || "",
    images: product.images || "[]",
    costPrice: product.costPrice ?? 0,
    stock: product.stock ?? 0,
  };
}
