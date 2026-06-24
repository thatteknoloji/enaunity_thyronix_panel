import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/modules/access";

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    const has = await hasModuleAccess(user.dealerId!, "AI_DROPSHIP", { userRole: user.role });
    if (!has) throw new Error("Bu modüle erişim yetkiniz yok");
    const dealerId = user.dealerId!;

    const body = await req.json();
    const { catalogCategory } = body;

    if (!catalogCategory) {
      return NextResponse.json({ success: false, error: "Kategori adı gerekli" }, { status: 400 });
    }

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 400 });
    }

    const catalogItems = await prisma.productCatalogItem.findMany({
      where: { category: catalogCategory },
      select: { id: true, salePrice: true, price: true },
    });

    if (catalogItems.length === 0) {
      return NextResponse.json({ success: false, error: "Bu kategoride ürün bulunamadı" }, { status: 404 });
    }

    const existingProducts = await prisma.storeProduct.findMany({
      where: { storeId: store.id },
      select: { productCatalogItemId: true },
    });
    const existingIds = new Set(existingProducts.map((p) => p.productCatalogItemId));

    const newItems = catalogItems.filter((ci) => !existingIds.has(ci.id));
    if (newItems.length === 0) {
      return NextResponse.json({ success: false, error: "Bu kategorideki tüm ürünler zaten mağazanda" }, { status: 400 });
    }

    let sortOrder = await prisma.storeProduct.aggregate({
      where: { storeId: store.id },
      _max: { sortOrder: true },
    });
    let nextOrder = (sortOrder._max.sortOrder ?? -1) + 1;

    const created = await prisma.$transaction(
      newItems.map((item) =>
        prisma.storeProduct.create({
          data: {
            storeId: store.id,
            productCatalogItemId: item.id,
            dealerPrice: item.salePrice || item.price || 0,
            sortOrder: nextOrder++,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: { addedCount: created.length, category: catalogCategory },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
