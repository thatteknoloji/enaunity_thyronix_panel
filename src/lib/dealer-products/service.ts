import { prisma } from "@/lib/db";
import { createCoreOrder } from "@/lib/orders/core-order-service";
import { buildOrderMetadata } from "@/lib/orders/config";
import { parseVariants, type DealerProductVariant } from "./types";

export type { DealerProductVariant } from "./types";
export { parseVariants } from "./types";

export async function listDealerProducts(dealerId: string, activeOnly = true) {
  return prisma.dealerProduct.findMany({
    where: { dealerId, ...(activeOnly ? { active: true } : {}) },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createDealerProduct(
  dealerId: string,
  data: {
    name: string;
    description?: string;
    imageUrl: string;
    specPdfUrl: string;
    variants?: DealerProductVariant[];
    basePrice?: number;
  }
) {
  if (!data.imageUrl || !data.specPdfUrl) {
    throw new Error("Ürün fotoğrafı ve PDF zorunlu");
  }
  return prisma.dealerProduct.create({
    data: {
      dealerId,
      name: data.name.trim(),
      description: data.description?.trim() || "",
      imageUrl: data.imageUrl,
      specPdfUrl: data.specPdfUrl,
      variantsJson: JSON.stringify(data.variants || []),
      basePrice: data.basePrice ?? 0,
    },
  });
}

export async function updateDealerProduct(
  dealerId: string,
  id: string,
  data: Partial<{
    name: string;
    description: string;
    imageUrl: string;
    specPdfUrl: string;
    variants: DealerProductVariant[];
    basePrice: number;
    active: boolean;
  }>
) {
  const existing = await prisma.dealerProduct.findFirst({ where: { id, dealerId } });
  if (!existing) throw new Error("Ürün bulunamadı");

  return prisma.dealerProduct.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.specPdfUrl !== undefined ? { specPdfUrl: data.specPdfUrl } : {}),
      ...(data.basePrice !== undefined ? { basePrice: data.basePrice } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.variants !== undefined ? { variantsJson: JSON.stringify(data.variants) } : {}),
    },
  });
}

export async function createManualOperasyonOrder(
  dealerId: string,
  input: {
    dealerProductId?: string;
    variantLabel?: string;
    productName?: string;
    quantity: number;
    unitPrice?: number;
    customerName?: string;
    customerPhone?: string;
    customerCity?: string;
    customerAddress?: string;
    orderImageUrl: string;
    orderPdfUrl: string;
    notes?: string;
  }
) {
  if (!input.orderImageUrl || !input.orderPdfUrl) {
    throw new Error("Sipariş fotoğrafı ve PDF zorunlu");
  }
  if (!input.quantity || input.quantity < 1) {
    throw new Error("Geçerli adet gerekli");
  }

  let productName = input.productName || "Manuel sipariş";
  let unitPrice = input.unitPrice ?? 0;
  let imageUrl = input.orderImageUrl;
  let specPdfUrl = input.orderPdfUrl;
  let sourceType = "MANUAL";

  if (input.dealerProductId) {
    const dp = await prisma.dealerProduct.findFirst({
      where: { id: input.dealerProductId, dealerId, active: true },
    });
    if (!dp) throw new Error("Bayi ürünü bulunamadı");

    const variants = parseVariants(dp.variantsJson);
    const variant = variants.find((v) => v.label === input.variantLabel) || variants[0];
    productName = `${dp.name}${variant?.label ? ` — ${variant.label}` : ""}`;
    unitPrice = variant?.price ?? dp.basePrice ?? unitPrice;
    imageUrl = dp.imageUrl;
    specPdfUrl = dp.specPdfUrl;
    sourceType = "DEALER_PRODUCT";
  }

  const result = await createCoreOrder({
    dealerId,
    customerName: input.customerName || "",
    customerPhone: input.customerPhone || "",
    customerCity: input.customerCity || "",
    customerAddress: input.customerAddress || "",
    sourceType,
    metadataJson: buildOrderMetadata({
      manualOrder: true,
      dealerProductId: input.dealerProductId || "",
      variantLabel: input.variantLabel || "",
      orderImageUrl: input.orderImageUrl,
      orderPdfUrl: input.orderPdfUrl,
      notes: input.notes || "",
    }),
    items: [
      {
        name: productName,
        quantity: input.quantity,
        salePrice: unitPrice,
        costPrice: Math.round(unitPrice * 0.65),
        sourceType,
        metadataJson: JSON.stringify({
          imageUrl,
          specPdfUrl,
          orderImageUrl: input.orderImageUrl,
          orderPdfUrl: input.orderPdfUrl,
          dealerProductId: input.dealerProductId || "",
          variantLabel: input.variantLabel || "",
        }),
      },
    ],
    fulfillmentStatus: "NEW",
    status: "processing",
    autoAccounting: false,
  });

  if (result.duplicate) return result.order;

  await prisma.orderAttachment.create({
    data: {
      orderId: result.order!.id,
      fileName: "siparis-belgesi.pdf",
      fileUrl: input.orderPdfUrl,
      fileType: "order_spec",
    },
  });

  await prisma.orderAttachment.create({
    data: {
      orderId: result.order!.id,
      fileName: "urun-fotografi.jpg",
      fileUrl: input.orderImageUrl,
      fileType: "image",
    },
  });

  return result.order;
}
