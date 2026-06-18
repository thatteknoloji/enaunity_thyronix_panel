import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireAdmin } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { slugify } from "@/lib/product-library/types";
import { ensureUniqueSlug, getCatalogCardsForDealer } from "@/lib/product-library/access";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });

    if (isAdminRole(user.role) || user.role === "admin") {
      const catalogs = await prisma.productCatalog.findMany({ orderBy: { updatedAt: "desc" } });
      return NextResponse.json({ success: true, data: catalogs });
    }

    if (!user.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const catalogs = await getCatalogCardsForDealer(user.dealerId);
    return NextResponse.json({ success: true, data: catalogs });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { name, description, status } = body;
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Katalog adı zorunlu" }, { status: 400 });
    }
    const base = slugify(name);
    const slug = await ensureUniqueSlug(base, "catalog");
    const catalog = await prisma.productCatalog.create({
      data: {
        name: name.trim(),
        slug,
        description: description || "",
        status: status || "DRAFT",
      },
    });
    return NextResponse.json({ success: true, data: catalog });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}
