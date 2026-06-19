import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createBannerSlot } from "@/lib/homepage/service";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { key, label, placement, displayMode, gridColumns } = await req.json();
    if (!key?.trim() || !label?.trim() || !placement) {
      return NextResponse.json({ success: false, error: "Anahtar, etiket ve konum zorunlu" }, { status: 400 });
    }
    const slug = key.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
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
      displayMode,
      gridColumns,
    });
    return NextResponse.json({ success: true, data: slot });
  } catch {
    return NextResponse.json({ success: false, error: "Oluşturulamadı" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { key, label, placement, displayMode, gridColumns, autoplay, intervalMs, active } = await req.json();
    if (!key) return NextResponse.json({ success: false, error: "key gerekli" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (label !== undefined) data.label = label;
    if (placement !== undefined) data.placement = placement;
    if (displayMode !== undefined) data.displayMode = displayMode;
    if (gridColumns !== undefined) data.gridColumns = gridColumns;
    if (autoplay !== undefined) data.autoplay = autoplay;
    if (intervalMs !== undefined) data.intervalMs = intervalMs;
    if (active !== undefined) data.active = active;

    const slot = await prisma.homeBannerSlot.update({ where: { key }, data });
    return NextResponse.json({ success: true, data: slot });
  } catch {
    return NextResponse.json({ success: false, error: "Güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
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
