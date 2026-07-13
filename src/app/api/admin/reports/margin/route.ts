import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        costPrice: true,
        stock: true,
        image: true,
        sku: true,
      },
      orderBy: { name: "asc" },
    });

    const marginData = products
      .filter(p => p.costPrice > 0)
      .map(p => {
        const margin = p.price - p.costPrice;
        const marginPercent = p.costPrice > 0 ? (margin / p.price) * 100 : 0;
        return {
          productId: p.id,
          productName: p.name,
          category: p.category,
          sku: p.sku,
          image: p.image,
          price: p.price,
          costPrice: p.costPrice,
          margin,
          marginPercent: Math.round(marginPercent * 10) / 10,
          stock: p.stock,
        };
      })
      .sort((a, b) => a.marginPercent - b.marginPercent);

    const categories = [...new Set(marginData.map(p => p.category))].map(cat => {
      const catItems = marginData.filter(p => p.category === cat);
      return {
        category: cat,
        avgMargin: catItems.length > 0
          ? Math.round((catItems.reduce((s, p) => s + p.marginPercent, 0) / catItems.length) * 10) / 10
          : 0,
        totalProducts: catItems.length,
        totalRevenue: catItems.reduce((s, p) => s + p.price * p.stock, 0),
        totalCost: catItems.reduce((s, p) => s + p.costPrice * p.stock, 0),
      };
    });

    const avgMargin = marginData.length > 0
      ? Math.round((marginData.reduce((s, p) => s + p.marginPercent, 0) / marginData.length) * 10) / 10
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        products: marginData,
        categories,
        summary: {
          totalProducts: marginData.length,
          avgMargin,
          highestMargin: marginData.length > 0 ? marginData[marginData.length - 1] : null,
          lowestMargin: marginData.length > 0 ? marginData[0] : null,
        },
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
