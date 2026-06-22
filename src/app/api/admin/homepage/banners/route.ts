import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { reorderHomeBanners } from "@/lib/homepage/service";

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const {
      slotKey, title, mediaType, imageDesktop, imageTablet, imageMobile,
      videoDesktop, videoMobile, linkUrl, linkTarget, startsAt, endsAt,
    } = body;

    if (!slotKey) {
      return NextResponse.json({ success: false, error: "Konum gerekli" }, { status: 400 });
    }
    const type = mediaType || "image";
    if (type === "video" && !videoDesktop) {
      return NextResponse.json({ success: false, error: "Masaüstü video gerekli" }, { status: 400 });
    }
    if (type === "image" && !imageDesktop) {
      return NextResponse.json({ success: false, error: "Masaüstü görseli gerekli" }, { status: 400 });
    }

    const max = await prisma.homeBanner.aggregate({
      where: { slotKey },
      _max: { sortOrder: true },
    });

    const banner = await prisma.homeBanner.create({
      data: {
        slotKey,
        title: title?.trim() || "",
        mediaType: type,
        imageDesktop: imageDesktop || "",
        imageTablet: imageTablet || "",
        imageMobile: imageMobile || "",
        videoDesktop: videoDesktop || "",
        videoMobile: videoMobile || "",
        linkUrl: linkUrl || "",
        linkTarget: linkTarget || "_self",
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        active: true,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });
    return NextResponse.json({ success: true, data: banner });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Banner eklenemedi";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });

    const allowed = [
      "title", "mediaType", "imageDesktop", "imageTablet", "imageMobile",
      "videoDesktop", "videoMobile", "linkUrl", "linkTarget", "active", "startsAt", "endsAt",
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
    await prisma.homeBanner.delete({ where: { id } });
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
    const { slotKey, ids } = await req.json();
    if (!slotKey || !Array.isArray(ids)) {
      return NextResponse.json({ success: false, error: "slotKey ve ids gerekli" }, { status: 400 });
    }
    const data = await reorderHomeBanners(slotKey, ids);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sıralama kaydedilemedi";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
