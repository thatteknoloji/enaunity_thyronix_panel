import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { category: true } });
    if (!product) return NextResponse.json({ success: false }, { status: 404 });

    // Check product-specific config first
    const productConfig = await prisma.shippingConfig.findFirst({ where: { type: "product", productId, active: true } });
    if (productConfig) return NextResponse.json({ success: true, data: productConfig });

    // Check category-based config
    const catConfig = await prisma.shippingConfig.findFirst({ where: { type: "category", category: product.category, active: true } });
    if (catConfig) return NextResponse.json({ success: true, data: catConfig });

    return NextResponse.json({ success: true, data: null });
  }

  const configs = await prisma.shippingConfig.findMany({ where: { active: true } });
  return NextResponse.json({ success: true, data: configs });
}
