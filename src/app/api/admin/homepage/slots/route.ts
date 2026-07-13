import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { createBannerSlot } from "@/lib/homepage/service";

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const { key, label, placement, categorySectionId, displayMode, gridColumns, backgroundColor, contentAlign, mobileLayout } = await req.json();
    if (!label?.trim() || !placement) {
      return NextResponse.json({ success: false, error: "Etiket ve konum zorunlu" }, { status: 400 });
    }
    if ((placement === "before_category" || placement === "after_category") && !categorySectionId) {
      return NextResponse.json({ success: false, error: "Kategori seçimi zorunlu" }, { status: 400 });
    }
    const slug = (key?.trim() || label).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!slug) {
      return NextResponse.json({ success: false, error: "Geçerli bir anahtar girin" }, { status: 400 });
    }
    const existing = await prisma.homeBannerSlot.findUnique({ where: { key: slug } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu anahtar zaten kullanılıyor" }, { status: 400 });
    }
    const slot = await createBannerSlot({
      key: slug,
      label: label.trim(),
      placement,
      categorySectionId: categorySectionId || null,
      displayMode,
      gridColumns,
      backgroundColor,
      contentAlign,
      mobileLayout,
    });
    return NextResponse.json({ success: true, data: slot });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Oluşturulamadı";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireSuperAdmin();
    const { key, label, placement, categorySectionId, displayMode, gridColumns, autoplay, intervalMs, active, backgroundColor, contentAlign, mobileLayout } = await req.json();
    if (!key) return NextResponse.json({ success: false, error: "key gerekli" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (label !== undefined) data.label = label;
    if (placement !== undefined) data.placement = placement;
    if (categorySectionId !== undefined) data.categorySectionId = categorySectionId || null;
    if (displayMode !== undefined) data.displayMode = displayMode;
    if (gridColumns !== undefined) data.gridColumns = gridColumns;
    if (autoplay !== undefined) data.autoplay = autoplay;
    if (intervalMs !== undefined) data.intervalMs = intervalMs;
    if (active !== undefined) data.active = active;
    if (backgroundColor !== undefined) data.backgroundColor = backgroundColor;
    if (contentAlign !== undefined) data.contentAlign = contentAlign;
    if (mobileLayout !== undefined) data.mobileLayout = mobileLayout;

    const slot = await prisma.homeBannerSlot.update({ where: { key }, data });
    return NextResponse.json({ success: true, data: slot });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncellenemedi";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireSuperAdmin();
    const { key } = await req.json();
    if (!key) return NextResponse.json({ success: false, error: "key gerekli" }, { status: 400 });
    const protectedKeys = ["after_hero", "after_features", "after_search", "before_ecosystem", "before_partners"];
    if (protectedKeys.includes(key)) {
      return NextResponse.json({ success: false, error: "Varsayılan konumlar silinemez, gizleyebilirsiniz" }, { status: 400 });
    }
    await prisma.homeBannerSlot.delete({ where: { key } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Silinemedi" }, { status: 500 });
  }
}
