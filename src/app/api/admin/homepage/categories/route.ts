import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { reorderHomeCategories } from "@/lib/homepage/service";

export async function POST(req: Request) {
  try {
    await requireAdmin();
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
  } catch {
    return NextResponse.json({ success: false, error: "Eklenemedi" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, title, maxProducts, active, categoryName } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (maxProducts !== undefined) data.maxProducts = maxProducts;
    if (active !== undefined) data.active = active;
    if (categoryName !== undefined) data.categoryName = categoryName;

    const cat = await prisma.homeCategorySection.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: cat });
  } catch {
    return NextResponse.json({ success: false, error: "Güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });
    await prisma.homeCategorySection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Silinemedi" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { ids } = await req.json();
    if (!Array.isArray(ids)) {
      return NextResponse.json({ success: false, error: "ids dizisi gerekli" }, { status: 400 });
    }
    const data = await reorderHomeCategories(ids);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Sıralama kaydedilemedi" }, { status: 500 });
  }
}
