import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";
import {
  THYRONIX_CARGO_PRESETS,
  THYRONIX_MARKETPLACE_PRESETS,
} from "@/lib/thyronix/analysis-presets";
import { buildFeedQuality } from "@/lib/analysis/types";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const products = await prisma.thyronixProduct.findMany({
      where: withTenantFilter(user, {}),
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        name: true,
        description: true,
        brand: true,
        category: true,
        barcode: true,
        stockCode: true,
        modelCode: true,
        price: true,
        costPrice: true,
        stock: true,
        image: true,
        images: true,
        vatRate: true,
        shippingCost: true,
        deliveryTime: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        marketplaces: THYRONIX_MARKETPLACE_PRESETS,
        cargoes: THYRONIX_CARGO_PRESETS,
        products: products.map((product) => {
          const imageList = [product.image, ...(product.images || "").split(",").map((item) => item.trim())].filter(Boolean);
          return {
            ...product,
            source: "thyronix" as const,
            sourceLabel: "THYRONIX",
            imageCount: imageList.length,
            feedQuality: buildFeedQuality({
              category: product.category,
              barcode: product.barcode,
              stockCode: product.stockCode,
              modelCode: product.modelCode,
              vatRate: product.vatRate,
              costPrice: product.costPrice,
              description: product.description,
              imageCount: imageList.length,
              variantCount: product.modelCode ? 1 : 0,
            }),
            updatedAt: new Date().toISOString(),
          };
        }),
      },
    });
  } catch (error) {
    return thyronixErrorResponse(error);
  }
}
