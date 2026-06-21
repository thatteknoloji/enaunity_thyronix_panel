import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_CATEGORY_HIGHLIGHTS,
  parseTrustBadges,
  serializeHighlights,
  serializeTrustBadges,
} from "@/lib/products/presentation";

type Params = { params: Promise<{ category: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { category: raw } = await params;
    const category = decodeURIComponent(raw);
    let row = await prisma.productCategoryPresentation.findUnique({ where: { category } });
    if (!row) {
      const defaults = DEFAULT_CATEGORY_HIGHLIGHTS[category] || [];
      row = await prisma.productCategoryPresentation.create({
        data: {
          category,
          highlightsJson: serializeHighlights(defaults),
        },
      });
    }
    return NextResponse.json({
      success: true,
      data: {
        category: row.category,
        badgeText: row.badgeText,
        highlights: JSON.parse(row.highlightsJson || "[]"),
        trustBadges: parseTrustBadges(row.trustBadgesJson),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { category: raw } = await params;
    const category = decodeURIComponent(raw);
    const body = await req.json();
    const highlights = Array.isArray(body.highlights)
      ? body.highlights.map(String).filter(Boolean)
      : [];
    const trustBadges = Array.isArray(body.trustBadges) ? body.trustBadges : [];
    const row = await prisma.productCategoryPresentation.upsert({
      where: { category },
      create: {
        category,
        badgeText: String(body.badgeText || "").trim(),
        highlightsJson: serializeHighlights(highlights),
        trustBadgesJson: serializeTrustBadges(trustBadges),
      },
      update: {
        badgeText: String(body.badgeText || "").trim(),
        highlightsJson: serializeHighlights(highlights),
        trustBadgesJson: serializeTrustBadges(trustBadges),
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        category: row.category,
        badgeText: row.badgeText,
        highlights: JSON.parse(row.highlightsJson || "[]"),
        trustBadges: parseTrustBadges(row.trustBadgesJson),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
