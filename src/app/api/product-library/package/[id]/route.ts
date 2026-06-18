import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { dealerCanAccessPackage } from "@/lib/product-library/access";
import { getPackageItems } from "@/lib/product-library/items";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const access = await dealerCanAccessPackage(user.dealerId!, id);
    if (!access.ok) {
      return NextResponse.json({ success: false, error: "Erişim reddedildi" }, { status: 403 });
    }

    const items = await getPackageItems(id);
    let catalogIds: string[] = [];
    try {
      catalogIds = JSON.parse(access.pkg.catalogIds || "[]");
    } catch {}

    const catalogs = catalogIds.length
      ? await prisma.productCatalog.findMany({ where: { id: { in: catalogIds } } })
      : [];

    const brandCount = new Set(items.map((i) => i.brand).filter(Boolean)).size;

    return NextResponse.json({
      success: true,
      data: {
        package: access.pkg,
        catalogs,
        productCount: items.length,
        brandCount,
        thyronixReady: access.pkg.thyronixReady,
        tier: access.tier,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
