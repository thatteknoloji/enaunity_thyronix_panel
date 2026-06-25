import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { listDealerProducts, parseVariants } from "@/lib/dealer-products/service";
import {
  THYRONIX_CARGO_PRESETS,
  THYRONIX_MARKETPLACE_PRESETS,
} from "@/lib/thyronix/analysis-presets";

export async function GET() {
  try {
    const user = await requireAuth();
    const isAdmin = isAdminRole(user.role);

    if (!user.dealerId && !isAdmin) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 403 });
    }

    const products = user.dealerId ? await listDealerProducts(user.dealerId, false) : [];

    return NextResponse.json({
      success: true,
      data: {
        marketplaces: THYRONIX_MARKETPLACE_PRESETS,
        cargoes: THYRONIX_CARGO_PRESETS,
        products: products.map((product) => {
          const variants = parseVariants(product.variantsJson || "[]");
          return {
            id: product.id,
            name: product.name,
            description: product.description || null,
            brand: null,
            category: null,
            barcode: null,
            stockCode: null,
            modelCode: variants[0]?.label || null,
            price: product.basePrice || 0,
            costPrice: null,
            stock: 0,
            image: product.imageUrl || null,
            images: null,
            imageCount: product.imageUrl ? 1 : 0,
            vatRate: null,
            shippingCost: null,
            deliveryTime: null,
          };
        }),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
