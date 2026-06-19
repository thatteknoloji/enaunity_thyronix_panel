import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { reorderHomeBanners } from "@/lib/homepage/service";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { slotKey, title, imageDesktop, imageTablet, imageMobile, linkUrl, linkTarget, startsAt, endsAt } = body;

    if (!slotKey || !imageDesktop) {
      return NextResponse.json({ success: false, error: "Konum ve masaüstü görseli gerekli" }, { status: 400 });
    }

    const max = await prisma.homeBanner.aggregate({
      where: { slotKey },
      _max: { sortOrder: true },
    });

    const banner = await prisma.homeBanner.create({
      data: {
        slotKey,
        title: title?.trim() || "",
        imageDesktop,
        imageTablet: imageTablet || "",
        imageMobile: imageMobile || "",
        linkUrl: linkUrl || "",
        linkTarget: linkTarget || "_self",
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        active: true,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });
    return NextResponse.json({ success: true, data: banner });
  } catch {
    return NextResponse.json({ success: false, error: "Banner eklenemedi" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });

    const allowed = [
      "title", "imageDesktop", "imageTablet", "imageMobile",
      "linkUrl", "linkTarget", "active", "startsAt", "endsAt",
    ] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (rest[key] !== undefined) {
        if (key === "startsAt" || key === "endsAt") {
          data[key] = rest[key] ? new Date(rest[key]) : null;
        } else {
          data[key] = rest[key];
        }
      }
    }

    const banner = await prisma.homeBanner.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: banner });
  } catch {
    return NextResponse.json({ success: false, error: "Güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });
    await prisma.homeBanner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Silinemedi" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { slotKey, ids } = await req.json();
    if (!slotKey || !Array.isArray(ids)) {
      return NextResponse.json({ success: false, error: "slotKey ve ids gerekli" }, { status: 400 });
    }
    const data = await reorderHomeBanners(slotKey, ids);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Sıralama kaydedilemedi" }, { status: 500 });
  }
}
