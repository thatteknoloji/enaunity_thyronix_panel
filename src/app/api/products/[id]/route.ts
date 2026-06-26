import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireAdmin } from "@/lib/auth";
import { getDealerPrice } from "@/lib/dealer-pricing";
import { findProductByKey } from "@/lib/products/resolve-product";
import { resolveProductPresentation } from "@/lib/products/presentation";
import {
  getProductEngineProfile,
  updateProductEngineProfile,
} from "@/lib/product-engine/profile-aggregator";
import type { ProductEngineOverrides } from "@/lib/product-engine/types";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    if (searchParams.get("engine") === "1") {
      await requireAdmin();
      const profile = await getProductEngineProfile(id);
      if (!profile) {
        return NextResponse.json({ success: false, error: "Ürün profili bulunamadı" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: profile });
    }

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

    const presentation = await resolveProductPresentation(product);

    return NextResponse.json({
      success: true,
      data: { ...product, effectivePrice, dealerDiscount, isDealer, minOrderQuantity, presentation },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    const status = msg.includes("Yetkisiz") || msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const body = await req.json();

    if (searchParams.get("engine") === "1" || body.engine) {
      await requireAdmin();
      const overrides = (body.overrides ?? body) as ProductEngineOverrides;
      const updated = await updateProductEngineProfile(id, overrides);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Geçersiz istek" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    const status = msg.includes("Yetkisiz") || msg.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
