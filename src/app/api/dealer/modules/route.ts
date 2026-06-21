import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCustomerProductsOverview } from "@/lib/customer-products/service";
import { getDealerMarketplaceOverview, buildHeaderNavItems } from "@/lib/modules/marketplace";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş gerekli", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    if (user.role !== "dealer" || !user.dealerId) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 403 });
    }

    const overview = await getCustomerProductsOverview(user);
    const marketplace = await getDealerMarketplaceOverview(user.dealerId, overview.products);

    return NextResponse.json({
      success: true,
      data: {
        ...marketplace,
        headerNav: buildHeaderNavItems(marketplace.modules),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Modül verisi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
