import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

type DbClient = typeof prisma | Prisma.TransactionClient;

export interface AdminVariantGroupInput {
  name: string;
  options: string[];
}

export interface AdminVariantInput {
  sku: string;
  barcode: string;
  price: number;
  stock: number;
  options: string;
  image?: string;
  active?: boolean;
}

export interface NormalizedAdminProductPayload {
  name: string;
  description: string;
  price: number;
  image: string;
  images: string;
  category: string;
  subcategory: string;
  brand: string;
  modelCode: string;
  sku: string;
  barcode: string;
  weight: number;
  dimensions: string;
  tags: string;
  stock: number;
  minStockLevel: number;
  maxStockLevel: number;
  backorderable: boolean;
  eta: string;
  vatRate: number;
  vatIncluded: boolean;
  specs: string;
  variantDisplayMode: string;
  salePrice: number;
  discountLabel: string;
  subtitle: string;
  shortDescription: string;
  badgeText: string;
  highlightsJson: string;
  trustBadgesJson: string;
  campaignIds: string[];
  variantGroups: AdminVariantGroupInput[];
  variants: AdminVariantInput[];
}

export interface DuplicateConflict {
  scope: "product" | "variant";
  field: "sku" | "barcode" | "modelCode";
  value: string;
  sourceProductId: string;
  sourceProductName: string;
  sourceVariantId?: string;
  label: string;
}

export interface DuplicateProbePayload {
  sku?: string;
  barcode?: string;
  modelCode?: string;
  variants?: Array<{ sku?: string; barcode?: string }>;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integerValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeImages(image: unknown, images: unknown) {
  const gallery = parseJsonArray(images)
    .map((item) => text(item))
    .filter(Boolean);
  const main = text(image) || gallery[0] || "";
  const merged = main ? [main, ...gallery.filter((item) => item !== main)] : gallery;
  return {
    image: main,
    images: JSON.stringify(merged),
  };
}

function normalizeVariantGroups(raw: unknown): AdminVariantGroupInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((group) => {
      const source = (group ?? {}) as Record<string, unknown>;
      const name = text(source.name);
      const options = Array.isArray(source.options)
        ? Array.from(new Set(source.options.map((item) => text(item)).filter(Boolean)))
        : [];
      return { name, options };
    })
    .filter((group) => group.name);
}

function normalizeVariantOptions(value: unknown) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

function normalizeVariants(raw: unknown): AdminVariantInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((variant) => {
      const source = (variant ?? {}) as Record<string, unknown>;
      const options = normalizeVariantOptions(source.options)
        .map((item) => {
          const option = (item ?? {}) as Record<string, unknown>;
          return {
            group: text(option.group),
            value: text(option.value),
          };
        })
        .filter((item) => item.group && item.value);
      return {
        sku: text(source.sku),
        barcode: text(source.barcode),
        price: numberValue(source.price),
        stock: integerValue(source.stock),
        options: JSON.stringify(options),
        image: text(source.image),
        active: source.active === undefined ? true : boolValue(source.active, true),
      };
    })
    .filter((variant) => variant.sku || variant.barcode || variant.options !== "[]");
}

export function validateAdminProductPayload(raw: Record<string, unknown>) {
  const errors: string[] = [];
  const gallery = normalizeImages(raw.image, raw.images);
  const campaignIds = Array.from(
    new Set(
      (Array.isArray(raw.campaignIds) ? raw.campaignIds : [])
        .map((value) => text(value))
        .filter(Boolean),
    ),
  );
  const variantGroups = normalizeVariantGroups(raw.variantGroups);
  const variants = normalizeVariants(raw.variants);
  const specs = parseJsonArray(raw.specs)
    .map((item) => {
      const source = (item ?? {}) as Record<string, unknown>;
      return {
        key: text(source.key),
        value: text(source.value),
      };
    })
    .filter((item) => item.key);

  const payload: NormalizedAdminProductPayload = {
    name: text(raw.name),
    description: text(raw.description),
    price: numberValue(raw.price),
    image: gallery.image,
    images: gallery.images,
    category: text(raw.category) || "general",
    subcategory: text(raw.subcategory),
    brand: text(raw.brand),
    modelCode: text(raw.modelCode),
    sku: text(raw.sku),
    barcode: text(raw.barcode),
    weight: numberValue(raw.weight),
    dimensions: text(raw.dimensions),
    tags: text(raw.tags),
    stock: integerValue(raw.stock),
    minStockLevel: integerValue(raw.minStockLevel),
    maxStockLevel: integerValue(raw.maxStockLevel),
    backorderable: boolValue(raw.backorderable),
    eta: text(raw.eta),
    vatRate: numberValue(raw.vatRate, 20),
    vatIncluded: boolValue(raw.vatIncluded, true),
    specs: JSON.stringify(specs),
    variantDisplayMode: text(raw.variantDisplayMode) || "buttons",
    salePrice: numberValue(raw.salePrice),
    discountLabel: text(raw.discountLabel),
    subtitle: text(raw.subtitle),
    shortDescription: text(raw.shortDescription),
    badgeText: text(raw.badgeText),
    highlightsJson: JSON.stringify(parseJsonArray(raw.highlightsJson ?? raw.highlights).filter(Boolean)),
    trustBadgesJson: JSON.stringify(parseJsonArray(raw.trustBadgesJson ?? raw.trustBadges).filter(Boolean)),
    campaignIds,
    variantGroups,
    variants,
  };

  if (!payload.name) errors.push("Ürün adı zorunlu.");
  if (!payload.category) errors.push("Kategori seçimi zorunlu.");
  if (payload.price < 0) errors.push("Fiyat negatif olamaz.");
  if (payload.stock < 0) errors.push("Stok negatif olamaz.");
  if (payload.minStockLevel < 0 || payload.maxStockLevel < 0) {
    errors.push("Stok limitleri negatif olamaz.");
  }
  if (payload.vatRate < 0 || payload.vatRate > 100) {
    errors.push("KDV oranı 0 ile 100 arasında olmalı.");
  }
  if (payload.salePrice < 0) errors.push("İndirimli fiyat negatif olamaz.");
  if (payload.salePrice > 0 && payload.salePrice > payload.price) {
    errors.push("İndirimli fiyat ürün fiyatından büyük olamaz.");
  }
  if (payload.backorderable && !payload.eta) {
    errors.push("Ön sipariş için tahmini teslimat girilmeli.");
  }

  const seenGroupNames = new Set<string>();
  for (const group of payload.variantGroups) {
    const key = group.name.toLocaleLowerCase("tr-TR");
    if (seenGroupNames.has(key)) {
      errors.push(`Varyant grubu tekrar ediyor: ${group.name}`);
    }
    seenGroupNames.add(key);
  }

  const duplicateMap = new Map<string, string>();
  const trackValue = (field: "sku" | "barcode", value: string, label: string) => {
    if (!value) return;
    const key = `${field}:${value.toLocaleLowerCase("tr-TR")}`;
    const previous = duplicateMap.get(key);
    if (previous) {
      errors.push(`${label} değeri tekrar ediyor: ${value} (${previous} ile aynı)`);
    } else {
      duplicateMap.set(key, label);
    }
  };

  trackValue("sku", payload.sku, "Ana ürün SKU");
  trackValue("barcode", payload.barcode, "Ana ürün barkodu");
  payload.variants.forEach((variant, index) => {
    if (!variant.sku) {
      errors.push(`Varyant ${index + 1} için SKU zorunlu.`);
    }
    if (variant.price < 0 || variant.stock < 0) {
      errors.push(`Varyant ${index + 1} için fiyat ve stok negatif olamaz.`);
    }
    trackValue("sku", variant.sku, `Varyant ${index + 1} SKU`);
    trackValue("barcode", variant.barcode, `Varyant ${index + 1} barkod`);
  });

  if (payload.variants.length > 0) {
    payload.stock = payload.variants.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0);
  }

  return { payload, errors };
}

export async function findProductDuplicateConflicts(
  probe: DuplicateProbePayload,
  excludeProductId?: string,
) {
  const conflicts: DuplicateConflict[] = [];
  const pushConflict = (conflict: DuplicateConflict) => {
    const key = [
      conflict.scope,
      conflict.field,
      conflict.value.toLocaleLowerCase("tr-TR"),
      conflict.sourceProductId,
      conflict.sourceVariantId || "",
    ].join(":");
    if (!conflicts.some((item) => [
      item.scope,
      item.field,
      item.value.toLocaleLowerCase("tr-TR"),
      item.sourceProductId,
      item.sourceVariantId || "",
    ].join(":") === key)) {
      conflicts.push(conflict);
    }
  };

  const productLookups: Array<{ field: "sku" | "barcode" | "modelCode"; value: string; label: string }> = [
    { field: "sku", value: text(probe.sku), label: "Ana ürün SKU" },
    { field: "barcode", value: text(probe.barcode), label: "Ana ürün barkodu" },
    { field: "modelCode", value: text(probe.modelCode), label: "Model kodu" },
  ];

  for (const lookup of productLookups) {
    if (!lookup.value) continue;
    const existing = await prisma.product.findFirst({
      where: {
        [lookup.field]: lookup.value,
        ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
      },
      select: { id: true, name: true },
    });
    if (existing) {
      pushConflict({
        scope: "product",
        field: lookup.field,
        value: lookup.value,
        sourceProductId: existing.id,
        sourceProductName: existing.name,
        label: lookup.label,
      });
    }
  }

  const variants = Array.isArray(probe.variants) ? probe.variants : [];
  for (const variant of variants) {
    const sku = text(variant.sku);
    const barcode = text(variant.barcode);

    if (sku) {
      const existing = await prisma.variant.findFirst({
        where: {
          sku,
          ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
        },
        include: {
          product: { select: { id: true, name: true } },
        },
      });
      if (existing) {
        pushConflict({
          scope: "variant",
          field: "sku",
          value: sku,
          sourceProductId: existing.product.id,
          sourceProductName: existing.product.name,
          sourceVariantId: existing.id,
          label: "Varyant SKU",
        });
      }
    }

    if (barcode) {
      const existing = await prisma.variant.findFirst({
        where: {
          barcode,
          ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
        },
        include: {
          product: { select: { id: true, name: true } },
        },
      });
      if (existing) {
        pushConflict({
          scope: "variant",
          field: "barcode",
          value: barcode,
          sourceProductId: existing.product.id,
          sourceProductName: existing.product.name,
          sourceVariantId: existing.id,
          label: "Varyant barkodu",
        });
      }
    }
  }

  return conflicts;
}

async function ensureProductSlug(
  db: DbClient,
  name: string,
  sku: string,
  excludeProductId?: string,
) {
  const base = slugify(name) || slugify(sku) || "urun";
  let attempt = base;
  let index = 1;

  while (true) {
    const existing = await db.product.findUnique({ where: { slug: attempt } });
    if (!existing || existing.id === excludeProductId) return attempt;
    attempt = `${base}-${index}`;
    index += 1;
  }
}

export async function saveAdminProductGraph(
  payload: NormalizedAdminProductPayload,
  options: { productId?: string } = {},
) {
  const { productId } = options;

  return prisma.$transaction(async (tx) => {
    const slug = await ensureProductSlug(tx, payload.name, payload.sku || payload.modelCode, productId);
    const finalStock =
      payload.variants.length > 0
        ? payload.variants.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0)
        : payload.stock;

    const productData = {
      name: payload.name,
      description: payload.description || payload.name,
      price: payload.price,
      image: payload.image || "/placeholder.svg",
      images: payload.images,
      category: payload.category,
      subcategory: payload.subcategory,
      brand: payload.brand,
      sku: payload.sku,
      barcode: payload.barcode,
      modelCode: payload.modelCode,
      specs: payload.specs,
      weight: payload.weight,
      dimensions: payload.dimensions,
      tags: payload.tags,
      stock: finalStock,
      minStockLevel: payload.minStockLevel,
      maxStockLevel: payload.maxStockLevel,
      variantDisplayMode: payload.variantDisplayMode,
      salePrice: payload.salePrice,
      discountLabel: payload.discountLabel,
      subtitle: payload.subtitle,
      shortDescription: payload.shortDescription,
      badgeText: payload.badgeText,
      highlightsJson: payload.highlightsJson,
      trustBadgesJson: payload.trustBadgesJson,
      backorderable: payload.backorderable,
      eta: payload.eta,
      vatRate: payload.vatRate,
      vatIncluded: payload.vatIncluded,
      slug,
    };

    const product = productId
      ? await tx.product.update({
          where: { id: productId },
          data: productData,
        })
      : await tx.product.create({
          data: productData,
        });

    await tx.campaignProduct.deleteMany({
      where: { productId: product.id, type: "buy" },
    });
    if (payload.campaignIds.length > 0) {
      await tx.campaignProduct.createMany({
        data: payload.campaignIds.map((campaignId) => ({
          campaignId,
          productId: product.id,
          type: "buy",
          quantity: 1,
        })),
      });
    }

    await tx.variant.deleteMany({ where: { productId: product.id } });
    await tx.variantGroup.deleteMany({ where: { productId: product.id } });

    for (let groupIndex = 0; groupIndex < payload.variantGroups.length; groupIndex += 1) {
      const group = payload.variantGroups[groupIndex];
      await tx.variantGroup.create({
        data: {
          productId: product.id,
          name: group.name,
          sortOrder: groupIndex,
          options: {
            create: group.options.map((option, optionIndex) => ({
              value: option,
              sortOrder: optionIndex,
            })),
          },
        },
      });
    }

    if (payload.variants.length > 0) {
      await tx.variant.createMany({
        data: payload.variants.map((variant) => ({
          productId: product.id,
          sku: variant.sku,
          barcode: variant.barcode,
          price: variant.price,
          stock: variant.stock,
          options: variant.options,
          image: variant.image || "",
          active: variant.active !== false,
        })),
      });
    }

    return product;
  });
}
