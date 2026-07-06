import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { GroupedProduct } from "../marketplace-import/types";
import { parseFieldLocks, pickUnlocked, snapshotProductFields } from "./field-lock";
import { sanitizeDescription, sanitizeTitle } from "./transform";
import type { XmlFeedRules, XmlFeedSyncReport } from "./types";

function optionsKey(opts: { group: string; value: string }[]): string {
  return JSON.stringify(
    [...opts].sort((a, b) => a.group.localeCompare(b.group) || a.value.localeCompare(b.value)),
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "urun";
  let candidate = slug;
  let i = 0;
  while (await prisma.product.findUnique({ where: { slug: candidate } })) {
    i++;
    candidate = `${slug}-${i}`;
  }
  return candidate;
}

async function syncVariantGroups(productId: string, group: GroupedProduct) {
  const axisValues = new Map<string, Set<string>>();
  for (const row of group.rows) {
    for (const opt of row.variantOptions) {
      if (!axisValues.has(opt.group)) axisValues.set(opt.group, new Set());
      axisValues.get(opt.group)!.add(opt.value);
    }
  }
  let gi = 0;
  for (const groupName of axisValues.keys()) {
    let vg = await prisma.variantGroup.findFirst({ where: { productId, name: groupName } });
    if (!vg) {
      vg = await prisma.variantGroup.create({ data: { productId, name: groupName, sortOrder: gi++ } });
    }
    for (const value of axisValues.get(groupName) || []) {
      const existing = await prisma.variantOption.findFirst({ where: { groupId: vg.id, value } });
      if (!existing) await prisma.variantOption.create({ data: { groupId: vg.id, value } });
    }
  }
}

async function mergeUpsertVariant(
  productId: string,
  feedLinkId: string,
  row: GroupedProduct["rows"][0],
  rules: XmlFeedRules,
  errors: string[],
): Promise<"created" | "updated" | "skipped"> {
  const optsStr = JSON.stringify(row.variantOptions);
  if (row.barcode) {
    const byBarcode = await prisma.variant.findFirst({ where: { barcode: row.barcode } });
    if (byBarcode && byBarcode.productId !== productId && byBarcode.sku !== row.sku) {
      errors.push(`Barkod ${row.barcode}: çakışma`);
      return "skipped";
    }
  }

  let variant = null;
  if (row.variantOptions.length) {
    const all = await prisma.variant.findMany({ where: { productId } });
    variant = all.find((v) => optionsKey(JSON.parse(v.options || "[]")) === optionsKey(row.variantOptions)) || null;
  }
  if (!variant && row.sku) variant = await prisma.variant.findFirst({ where: { productId, sku: row.sku } });
  if (!variant && row.barcode) variant = await prisma.variant.findFirst({ where: { productId, barcode: row.barcode } });

  const incoming = {
    sku: row.sku,
    barcode: row.barcode,
    price: row.price,
    stock: row.stock,
    options: optsStr,
    image: row.image || "",
    active: true,
  };

  if (variant) {
    const link = await prisma.productFeedVariantLink.findUnique({ where: { variantId: variant.id } });
    const locks = parseFieldLocks(link?.lockedFieldsJson);
    const merged = pickUnlocked(incoming, variant as typeof incoming, locks);
    if (!locks.price) merged.price = variant.price;
    if (!locks.stock && !rules.updateStockOnSync) merged.stock = variant.stock;
    if (!rules.updateImagesOnSync) merged.image = variant.image;
    await prisma.variant.update({ where: { id: variant.id }, data: merged });
    if (link) {
      await prisma.productFeedVariantLink.update({
        where: { id: link.id },
        data: {
          sourceSku: row.sku,
          sourceBarcode: row.barcode,
          lastFeedSnapshotJson: JSON.stringify(incoming),
        },
      });
    } else {
      await prisma.productFeedVariantLink.create({
        data: {
          feedLinkId,
          variantId: variant.id,
          sourceSku: row.sku,
          sourceBarcode: row.barcode,
          lastFeedSnapshotJson: JSON.stringify(incoming),
        },
      });
    }
    return "updated";
  }

  const created = await prisma.variant.create({ data: { productId, ...incoming } });
  await prisma.productFeedVariantLink.create({
    data: {
      feedLinkId,
      variantId: created.id,
      sourceSku: row.sku,
      sourceBarcode: row.barcode,
      lastFeedSnapshotJson: JSON.stringify(incoming),
    },
  });
  return "created";
}

export async function mergeUpsertFeedGroups(
  feedId: string,
  groups: GroupedProduct[],
  rootCategory: string,
  rules: XmlFeedRules,
  externalIdByModel: Record<string, string>,
): Promise<Omit<XmlFeedSyncReport, "status" | "durationMs">> {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const group of groups) {
    if (group.errors.length) {
      skipped += group.rows.length;
      errors.push(`${group.modelCode}: ${group.errors[0]}`);
      continue;
    }
    if (!group.category?.trim()) {
      skipped += group.rows.length;
      errors.push(`${group.modelCode}: kategori eşlenmedi`);
      continue;
    }

    const imagesJson = JSON.stringify(group.images);
    const costPrice = Math.min(...group.rows.map((r) => Number(r.raw?.costPrice ?? r.price) || r.price));
    const incomingProduct = {
      name: sanitizeTitle(group.name),
      description: sanitizeDescription(group.description || group.name),
      brand: group.brand,
      category: group.category,
      subcategory: rootCategory,
      modelCode: group.modelCode,
      price: group.price,
      costPrice,
      stock: group.stock,
      image: group.image || "/placeholder.svg",
      images: imagesJson,
      sku: group.modelCode,
      seoTitle: sanitizeTitle(group.seoTitle || group.name),
      seoDescription: sanitizeDescription(group.seoDescription || group.description || group.name),
    };

    let product = await prisma.product.findFirst({ where: { modelCode: group.modelCode } });
    let feedLink = product
      ? await prisma.productFeedLink.findUnique({ where: { productId: product.id } })
      : null;

    if (product && feedLink && feedLink.feedId !== feedId) {
      skipped += group.rows.length;
      errors.push(`${group.modelCode}: farklı feed'e bağlı`);
      continue;
    }

    if (product) {
      const locks = parseFieldLocks(feedLink?.lockedFieldsJson);
      const merged = pickUnlocked(incomingProduct, snapshotProductFields(product), locks);
      if (!rules.updateImagesOnSync) {
        merged.image = product.image;
        merged.images = product.images;
      }
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          name: merged.name,
          description: merged.description,
          brand: merged.brand,
          category: merged.category,
          subcategory: merged.subcategory,
          price: merged.price,
          costPrice: locks.price ? product.costPrice : costPrice,
          stock: merged.stock,
          image: merged.image,
          images: merged.images,
          seoTitle: merged.seoTitle,
          seoDescription: merged.seoDescription,
        },
      });
      updated++;
    } else {
      const slug = await uniqueSlug(`${group.name}-${group.modelCode}`);
      product = await prisma.product.create({ data: { ...incomingProduct, slug } });
      added++;
    }

    feedLink = await prisma.productFeedLink.upsert({
      where: { productId: product.id },
      create: {
        feedId,
        productId: product.id,
        externalId: externalIdByModel[group.modelCode] || group.modelCode,
        sourceModelCode: group.modelCode,
        lastSyncedAt: new Date(),
        lastFeedSnapshotJson: JSON.stringify(incomingProduct),
      },
      update: {
        externalId: externalIdByModel[group.modelCode] || group.modelCode,
        sourceModelCode: group.modelCode,
        lastSyncedAt: new Date(),
        lastFeedSnapshotJson: JSON.stringify(incomingProduct),
      },
    });

    await syncVariantGroups(product.id, group);
    for (const row of group.rows) {
      const result = await mergeUpsertVariant(product.id, feedLink.id, row, rules, errors);
      if (result === "skipped") skipped++;
    }

    const variantStock = await prisma.variant.aggregate({
      where: { productId: product.id },
      _sum: { stock: true },
    });
    const minPrice = await prisma.variant.aggregate({
      where: { productId: product.id, active: true },
      _min: { price: true },
    });
    const locks = parseFieldLocks(feedLink.lockedFieldsJson);
    await prisma.product.update({
      where: { id: product.id },
      data: {
        stock: variantStock._sum.stock || 0,
        ...(!locks.price && minPrice._min.price != null ? { price: minPrice._min.price } : {}),
      },
    });
  }

  return { added, updated, skipped, errors };
}
