import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { loadDealerAnalysisProducts } from "@/lib/dealer/analysis-product-feed";
import { buildMarketplaceIntelligenceMeta } from "@/lib/marketplace-intelligence/marketplace-profit-engine";
import { listMarketplaceLabels } from "@/lib/marketplace-intelligence/marketplace-category-cache";
import { listCarriersForMarketplace } from "@/lib/marketplace-intelligence/marketplace-shipping-cache";
import type { MarketplaceId } from "@/lib/marketplace-intelligence/marketplace-types";

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

    const intelligence = buildMarketplaceIntelligenceMeta();
    const marketplaces = listMarketplaceLabels().map((item) => ({
      ...item,
      carriers: listCarriersForMarketplace(item.id as MarketplaceId),
    }));

    return NextResponse.json({
      success: true,
      data: {
        products,
        sourceCounts,
        marketplaceIntelligence: {
          ...intelligence,
          marketplaces,
        },
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
