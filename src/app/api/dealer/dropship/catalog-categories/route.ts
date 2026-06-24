import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/modules/access";

export async function GET(req: Request) {
  try {
    const user = await requireDealer();
    const has = await hasModuleAccess(user.dealerId!, "AI_DROPSHIP", { userRole: user.role });
    if (!has) throw new Error("Bu modüle erişim yetkiniz yok");
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").toLowerCase();

    const items = await prisma.productCatalogItem.findMany({
      where: {
        status: "ACTIVE",
        category: { not: "" },
        ...(search ? { category: { contains: search } } : {}),
      },
      select: {
        category: true,
      },
      distinct: ["category"],
      take: 50,
    });

    const counts = await Promise.all(
      items.map(async (item) => {
        const count = await prisma.productCatalogItem.count({
          where: { category: item.category, status: "ACTIVE" },
        });
        return { name: item.category, productCount: count };
      })
    );

    return NextResponse.json({ success: true, data: counts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
