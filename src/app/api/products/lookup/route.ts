import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { sku: { contains: q } },
          { barcode: { contains: q } },
          { modelCode: { contains: q } },
          { name: { contains: q } },
        ],
      },
      take: 20,
      orderBy: { name: "asc" },
      include: {
        variants: {
          where: { active: true },
          select: { id: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: products.map((p) => ({
        ...p,
        variantCount: p.variants.length,
        hasVariants: p.variants.length > 0,
        variants: undefined,
      })),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
