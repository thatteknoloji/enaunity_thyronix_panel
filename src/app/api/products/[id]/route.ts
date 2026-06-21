import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDealerPrice } from "@/lib/dealer-pricing";
import { findProductByKey } from "@/lib/products/resolve-product";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await findProductByKey(id);

    if (!product) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    const session = await getSession();
    let effectivePrice = product.price;
    let dealerDiscount = 0;
    let isDealer = false;
    let minOrderQuantity = product.minOrderQuantity;

    if (session?.dealerId) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: session.dealerId },
        select: { id: true, group: true, discountRate: true },
      });
      if (dealer) {
        isDealer = true;
        dealerDiscount = dealer.discountRate;
        effectivePrice = await getDealerPrice(product.id, product.price, dealer.group, dealer.discountRate, undefined, dealer.id);

        const restricted = await prisma.catalogRestriction.findUnique({
          where: { group_productId: { group: dealer.group, productId: product.id } },
        });
        if (restricted) {
          return NextResponse.json({ success: false, error: "Bu ürün size özel katalogda bulunmamaktadır" }, { status: 403 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...product, effectivePrice, dealerDiscount, isDealer, minOrderQuantity },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
