import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { bulkSetHomeCategoriesActive, reorderHomeCategories } from "@/lib/homepage/service";

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const { categoryName, title, maxProducts } = await req.json();
    if (!categoryName?.trim()) {
      return NextResponse.json({ success: false, error: "Kategori adı gerekli" }, { status: 400 });
    }

    const max = await prisma.homeCategorySection.aggregate({ _max: { sortOrder: true } });
    const cat = await prisma.homeCategorySection.create({
      data: {
        categoryName: categoryName.trim(),
        title: title?.trim() || categoryName.trim(),
        maxProducts: maxProducts ?? 12,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        active: true,
      },
    });
    return NextResponse.json({ success: true, data: cat });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Eklenemedi";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const { id, title, maxProducts, active, categoryName, bulkActive } = body;

    if (bulkActive !== undefined) {
      const data = await bulkSetHomeCategoriesActive(!!bulkActive);
      return NextResponse.json({ success: true, data });
    }

    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (maxProducts !== undefined) data.maxProducts = maxProducts;
    if (active !== undefined) data.active = active;
    if (categoryName !== undefined) data.categoryName = categoryName;

    const cat = await prisma.homeCategorySection.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: cat });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncellenemedi";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireSuperAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });
    await prisma.homeCategorySection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Silinemedi";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await requireSuperAdmin();
    const { ids } = await req.json();
    if (!Array.isArray(ids)) {
      return NextResponse.json({ success: false, error: "ids dizisi gerekli" }, { status: 400 });
    }
    const data = await reorderHomeCategories(ids);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sıralama kaydedilemedi";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
