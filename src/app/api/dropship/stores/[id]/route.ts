import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const store = await prisma.dealerStore.findUnique({
      where: { id },
      include: {
        products: { orderBy: { sortOrder: "asc" } },
        orders: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }
    const catalogItemIds = store.products.map((p) => p.productCatalogItemId);
    const catalogItems = catalogItemIds.length > 0
      ? await prisma.productCatalogItem.findMany({
          where: { id: { in: catalogItemIds } },
          select: { id: true, name: true, sku: true, imagesJson: true, category: true, description: true, basePrice: true },
        })
      : [];
    const catalogMap = Object.fromEntries(catalogItems.map((c) => [c.id, c]));
    const enrichedProducts = store.products.map((p) => ({ ...p, catalogItem: catalogMap[p.productCatalogItemId] || null }));
    return NextResponse.json({ success: true, data: { ...store, products: enrichedProducts } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const allowedFields = [
      "name", "slug", "customDomain", "customDomainVerified",
      "logo", "coverImage", "aboutText", "contactEmail", "contactPhone",
      "themeJson", "paymentModel", "status", "dealerId",
    ];
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    if (body.slug) {
      const existing = await prisma.dealerStore.findFirst({ where: { slug: body.slug, NOT: { id } } });
      if (existing) return NextResponse.json({ success: false, error: "Bu slug zaten kullanılıyor" }, { status: 400 });
    }
    const store = await prisma.dealerStore.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: store });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.storeOrder.deleteMany({ where: { storeId: id } });
    await prisma.storeProduct.deleteMany({ where: { storeId: id } });
    await prisma.dealerStore.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
