import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { loadDealerAnalysisProducts } from "@/lib/dealer/analysis-product-feed";
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

    const { products, sourceCounts } = user.dealerId
      ? await loadDealerAnalysisProducts(user.dealerId)
      : { products: [], sourceCounts: { dealerProduct: 0, storeCatalog: 0, packageCatalog: 0, total: 0 } };

    return NextResponse.json({
      success: true,
      data: {
        marketplaces: THYRONIX_MARKETPLACE_PRESETS,
        cargoes: THYRONIX_CARGO_PRESETS,
        products,
        sourceCounts,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
