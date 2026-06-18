import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/product-library/types";
import { ensureUniqueSlug, syncPackageCounts } from "@/lib/product-library/access";

export async function GET() {
  try {
    await requireAdmin();
    const packages = await prisma.productPackage.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ success: true, data: packages });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const {
      name, description, catalogIds, licenseLevel, monthlyPrice, yearlyPrice, isFree, thyronixReady, status,
      oneTimePrice, billingType, badgeText, isFeatured, isNew, isBestSeller, publishedAt,
    } = body;
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Paket adı zorunlu" }, { status: 400 });
    }
    const slug = await ensureUniqueSlug(slugify(name), "package");
    const pkg = await prisma.productPackage.create({
      data: {
        name: name.trim(),
        slug,
        description: description || "",
        catalogIds: JSON.stringify(catalogIds || []),
        licenseLevel: licenseLevel || "FREE",
        monthlyPrice: monthlyPrice ?? 0,
        yearlyPrice: yearlyPrice ?? 0,
        oneTimePrice: oneTimePrice ?? null,
        billingType: billingType || (isFree ? "FREE" : "MONTHLY"),
        badgeText: badgeText || null,
        isFeatured: !!isFeatured,
        isNew: !!isNew,
        isBestSeller: !!isBestSeller,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        isFree: !!isFree,
        thyronixReady: !!thyronixReady,
        status: status || "DRAFT",
      },
    });
    await syncPackageCounts(pkg.id);
    const updated = await prisma.productPackage.findUnique({ where: { id: pkg.id } });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}
