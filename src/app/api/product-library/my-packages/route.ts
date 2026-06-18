import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { getDealerPackageStates } from "@/lib/product-library/package-access-service";
import { getDealerLibraryTier } from "@/lib/product-library/license";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;
    const [packages, tier, downloads] = await Promise.all([
      getDealerPackageStates(dealerId),
      getDealerLibraryTier(dealerId),
      prisma.productDistributionLog.findMany({
        where: { dealerId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { package: { select: { name: true, slug: true } } },
      }),
    ]);
    return NextResponse.json({
      success: true,
      data: { packages, tier, downloads },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
