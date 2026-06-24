import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/modules/access";

async function requireDropshipAccess() {
  const user = await requireDealer();
  const has = await hasModuleAccess(user.dealerId!, "AI_DROPSHIP", { userRole: user.role });
  if (!has) throw new Error("Bu modüle erişim yetkiniz yok");
  return user;
}

export async function GET() {
  try {
    const user = await requireDropshipAccess();
    const dealerId = user.dealerId!;
    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Önce mağaza oluşturmalısın" }, { status: 400 });
    }
    const categories = await prisma.storeCategory.findMany({
      where: { storeId: store.id },
      orderBy: { sortOrder: "asc" },
    });

    const catalogCategories = categories
      .map((c) => c.catalogCategory)
      .filter(Boolean) as string[];

    const productCounts: Record<string, number> = {};
    if (catalogCategories.length > 0) {
      const storeProducts = await prisma.storeProduct.findMany({
        where: { storeId: store.id, isActive: true },
        select: { productCatalogItemId: true },
      });
      const catalogItemIds = storeProducts.map((sp) => sp.productCatalogItemId);
      const items = await prisma.productCatalogItem.findMany({
        where: { id: { in: catalogItemIds }, category: { in: catalogCategories } },
        select: { id: true, category: true },
      });
      for (const item of items) {
        productCounts[item.category] = (productCounts[item.category] || 0) + 1;
      }
    }

    const data = categories.map((cat) => ({
      ...cat,
      productCount: cat.catalogCategory ? (productCounts[cat.catalogCategory] || 0) : 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDropshipAccess();
    const dealerId = user.dealerId!;
    const body = await req.json();
    const { name, catalogCategory } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Kategori adı gerekli" }, { status: 400 });
    }

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Önce mağaza oluşturmalısın" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

    const existing = await prisma.storeCategory.findUnique({
      where: { storeId_slug: { storeId: store.id, slug } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu kategori zaten mevcut" }, { status: 400 });
    }

    const maxOrder = await prisma.storeCategory.aggregate({
      where: { storeId: store.id },
      _max: { sortOrder: true },
    });

    const category = await prisma.storeCategory.create({
      data: {
        storeId: store.id,
        name: name.trim(),
        catalogCategory: catalogCategory || null,
        slug,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireDropshipAccess();
    const dealerId = user.dealerId!;
    const body = await req.json();
    const { id, name, isActive, sortOrder } = body;

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const cat = await prisma.storeCategory.findFirst({
      where: { id, storeId: store.id },
    });
    if (!cat) {
      return NextResponse.json({ success: false, error: "Kategori bulunamadı" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined && name.trim()) {
      data.name = name.trim();
      data.slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    }
    if (isActive !== undefined) data.isActive = isActive;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const updated = await prisma.storeCategory.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireDropshipAccess();
    const dealerId = user.dealerId!;
    const body = await req.json();
    const { id } = body;

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const cat = await prisma.storeCategory.findFirst({
      where: { id, storeId: store.id },
    });
    if (!cat) {
      return NextResponse.json({ success: false, error: "Kategori bulunamadı" }, { status: 404 });
    }

    await prisma.storeCategory.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
