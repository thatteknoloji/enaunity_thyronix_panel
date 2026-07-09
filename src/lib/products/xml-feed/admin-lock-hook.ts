import type { Prisma } from "@prisma/client";
import type { prisma } from "@/lib/db";
import {
  detectChangedLocks,
  mergeFieldLocks,
  parseFieldLocks,
  snapshotProductFields,
} from "./field-lock";
import { PRODUCT_LOCKABLE_FIELDS, VARIANT_LOCKABLE_FIELDS } from "./types";

type DbClient = typeof prisma | Prisma.TransactionClient;

function snapshotVariantFields(variant: {
  sku: string;
  barcode: string;
  price: number;
  stock: number;
  image: string;
}) {
  return {
    sku: variant.sku,
    barcode: variant.barcode,
    price: variant.price,
    stock: variant.stock,
    image: variant.image || "",
  };
}

function findMatchingVariant(
  before: { sku: string; barcode: string; options: string },
  afterVariants: Array<{ id: string; sku: string; barcode: string; options: string }>,
) {
  return (
    afterVariants.find((v) => v.sku && v.sku === before.sku) ||
    afterVariants.find((v) => v.barcode && v.barcode === before.barcode) ||
    afterVariants.find((v) => v.options === before.options)
  );
}

export async function applyFeedFieldLocksAfterAdminSave(
  db: DbClient,
  productId: string,
  beforeProduct: {
    name: string;
    description: string;
    brand: string;
    price: number;
    category: string;
    subcategory: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    image?: string | null;
    images?: string | null;
  },
  afterProduct: {
    name: string;
    description: string;
    brand: string;
    price: number;
    category: string;
    subcategory: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    image?: string | null;
    images?: string | null;
  },
  beforeVariants: Array<{
    id: string;
    sku: string;
    barcode: string;
    price: number;
    stock: number;
    options: string;
    image: string;
    feedVariantLink: {
      id: string;
      feedLinkId: string;
      sourceSku: string;
      sourceBarcode: string;
      lockedFieldsJson: string;
      lastFeedSnapshotJson: string;
    } | null;
  }>,
) {
  const feedLink = await db.productFeedLink.findUnique({ where: { productId } });
  if (!feedLink) return;

  const productLocks = detectChangedLocks(
    snapshotProductFields({
      ...beforeProduct,
      seoTitle: beforeProduct.seoTitle ?? undefined,
      seoDescription: beforeProduct.seoDescription ?? undefined,
      image: beforeProduct.image ?? undefined,
      images: beforeProduct.images ?? undefined,
    }),
    snapshotProductFields({
      ...afterProduct,
      seoTitle: afterProduct.seoTitle ?? undefined,
      seoDescription: afterProduct.seoDescription ?? undefined,
      image: afterProduct.image ?? undefined,
      images: afterProduct.images ?? undefined,
    }),
    PRODUCT_LOCKABLE_FIELDS,
  );
  if (Object.keys(productLocks).length) {
    await db.productFeedLink.update({
      where: { id: feedLink.id },
      data: {
        lockedFieldsJson: JSON.stringify(
          mergeFieldLocks(parseFieldLocks(feedLink.lockedFieldsJson), productLocks),
        ),
      },
    });
  }

  const afterVariants = await db.variant.findMany({ where: { productId } });
  for (const beforeV of beforeVariants) {
    if (!beforeV.feedVariantLink) continue;
    const match = findMatchingVariant(beforeV, afterVariants);
    if (!match) continue;

    const variantLocks = detectChangedLocks(
      snapshotVariantFields(beforeV),
      snapshotVariantFields({ ...match, image: "" }),
      VARIANT_LOCKABLE_FIELDS,
    );
    const mergedLocks = mergeFieldLocks(
      parseFieldLocks(beforeV.feedVariantLink.lockedFieldsJson),
      variantLocks,
    );

    await db.productFeedVariantLink.upsert({
      where: { variantId: match.id },
      create: {
        feedLinkId: feedLink.id,
        variantId: match.id,
        sourceSku: beforeV.feedVariantLink.sourceSku,
        sourceBarcode: beforeV.feedVariantLink.sourceBarcode,
        lastFeedSnapshotJson: beforeV.feedVariantLink.lastFeedSnapshotJson,
        lockedFieldsJson: JSON.stringify(mergedLocks),
      },
      update: {
        lockedFieldsJson: JSON.stringify(mergedLocks),
      },
    });
  }
}
