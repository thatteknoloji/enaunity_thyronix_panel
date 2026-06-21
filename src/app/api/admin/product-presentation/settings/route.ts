import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_TRUST_BADGES,
  ensureCategoryPresentationDefaults,
  getProductPageSettings,
  parseTrustBadges,
  serializeTrustBadges,
} from "@/lib/products/presentation";

export async function GET() {
  try {
    await requireAdmin();
    await ensureCategoryPresentationDefaults();
    const settings = await getProductPageSettings();
    const categories = await prisma.productCategoryPresentation.findMany({
      orderBy: { category: "asc" },
    });
    return NextResponse.json({
      success: true,
      data: {
        defaultBadgeText: settings.defaultBadgeText,
        trustBadges: parseTrustBadges(settings.trustBadgesJson),
        showShortOnCatalog: settings.showShortOnCatalog,
        categories: categories.map((c) => ({
          category: c.category,
          badgeText: c.badgeText,
          highlights: JSON.parse(c.highlightsJson || "[]"),
          trustBadges: parseTrustBadges(c.trustBadgesJson),
        })),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const trustBadges = Array.isArray(body.trustBadges) ? body.trustBadges : DEFAULT_TRUST_BADGES;
    const settings = await prisma.productPageSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        defaultBadgeText: String(body.defaultBadgeText || "B4B Ürün").trim(),
        trustBadgesJson: serializeTrustBadges(trustBadges),
        showShortOnCatalog: body.showShortOnCatalog !== false,
      },
      update: {
        defaultBadgeText: String(body.defaultBadgeText || "B4B Ürün").trim(),
        trustBadgesJson: serializeTrustBadges(trustBadges),
        showShortOnCatalog: body.showShortOnCatalog !== false,
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        defaultBadgeText: settings.defaultBadgeText,
        trustBadges: parseTrustBadges(settings.trustBadgesJson),
        showShortOnCatalog: settings.showShortOnCatalog,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
