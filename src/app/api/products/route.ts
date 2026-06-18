import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDealerPrice } from "@/lib/dealer-pricing";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");
    const search = searchParams.get("search");
    const all = searchParams.get("all") === "true";

    const where: Record<string, unknown> = {};

    if (category && category !== "Tümü") where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
        { subcategory: { contains: search } },
      ];
    }

    let products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (!all) {
      const session = await getSession();
      if (session?.dealerId) {
        const dealer = await prisma.dealer.findUnique({
          where: { id: session.dealerId },
          select: { id: true, group: true, discountRate: true },
        });
        if (dealer) {
          const restricted = await prisma.catalogRestriction.findMany({
            where: { group: dealer.group },
            select: { productId: true },
          });
          const restrictedIds = new Set(restricted.map((r) => r.productId));
          products = products.filter((p) => !restrictedIds.has(p.id));

          products = await Promise.all(
            products.map(async (p) => ({
              ...p,
              price: await getDealerPrice(p.id, p.price, dealer.group, dealer.discountRate, undefined, dealer.id),
            }))
          );
        }
      }
    }

    return NextResponse.json({ success: true, data: products });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
