import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Önce mağaza oluşturmalısın" }, { status: 400 });
    }

    const products = await prisma.storeProduct.findMany({
      where: { storeId: store.id },
      orderBy: { sortOrder: "asc" },
    });

    const catalogItemIds = products.map((p) => p.productCatalogItemId);
    const catalogItems = catalogItemIds.length > 0
      ? await prisma.productCatalogItem.findMany({
          where: { id: { in: catalogItemIds } },
          select: { id: true, name: true, sku: true, imagesJson: true, category: true },
        })
      : [];

    const catalogMap = Object.fromEntries(catalogItems.map((c) => [c.id, c]));

    const enriched = products.map((p) => ({
      ...p,
      catalogItem: catalogMap[p.productCatalogItemId] || null,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;
    const body = await req.json();

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Önce mağaza oluşturmalısın" }, { status: 400 });
    }

    const { productCatalogItemId, dealerPrice } = body;
    if (!productCatalogItemId) {
      return NextResponse.json({ success: false, error: "Ürün ID gerekli" }, { status: 400 });
    }

    const existing = await prisma.storeProduct.findUnique({
      where: { storeId_productCatalogItemId: { storeId: store.id, productCatalogItemId } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu ürün zaten mağazanda" }, { status: 400 });
    }

    const maxSort = await prisma.storeProduct.findFirst({
      where: { storeId: store.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const product = await prisma.storeProduct.create({
      data: {
        storeId: store.id,
        productCatalogItemId,
        dealerPrice: dealerPrice || 0,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;
    const body = await req.json();

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const { id, dealerPrice, isActive, sortOrder } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Ürün ID gerekli" }, { status: 400 });
    }

    const product = await prisma.storeProduct.findFirst({
      where: { id, storeId: store.id },
    });
    if (!product) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (dealerPrice !== undefined) data.dealerPrice = dealerPrice;
    if (isActive !== undefined) data.isActive = isActive;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const updated = await prisma.storeProduct.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;
    const body = await req.json();

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const { id } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Ürün ID gerekli" }, { status: 400 });
    }

    const product = await prisma.storeProduct.findFirst({ where: { id, storeId: store.id } });
    if (!product) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    await prisma.storeProduct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
