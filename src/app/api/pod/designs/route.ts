import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth/admin-access";
import { requirePodCreatorApiAccess } from "@/lib/pod/api-guard";
import { processDesignUpload } from "@/lib/pod/upload";
import { getPodDealerFilter } from "@/lib/pod/tenant-access";
import { getPodLicenseStatus } from "@/lib/pod/access";

export async function GET(req: Request) {
  try {
    const { error, user } = await requirePodCreatorApiAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10) || 20);

    const where = getPodDealerFilter(user!);
    const [items, total] = await Promise.all([
      prisma.pODDesign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pODDesign.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Tasarımlar alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePodCreatorApiAccess();
    if (error) return error;

    if (!user!.dealerId && !isAdminRole(user!.role)) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 400 });
    }

    const dealerId = user!.dealerId || "admin";
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") || "").trim() || "Yeni Tasarım";
    const description = String(formData.get("description") || "").trim();

    if (!file) {
      return NextResponse.json({ success: false, error: "Dosya gerekli" }, { status: 400 });
    }

    if (user!.dealerId) {
      const status = await getPodLicenseStatus(user!.dealerId);
      const maxDesigns = status.limits?.maxDesigns;
      if (maxDesigns) {
        const count = await prisma.pODDesign.count({ where: { dealerId: user!.dealerId } });
        if (count >= maxDesigns) {
          return NextResponse.json(
            { success: false, error: `Tasarım limiti (${maxDesigns}) doldu` },
            { status: 403 }
          );
        }
      }
    }

    const processed = await processDesignUpload(file, dealerId);

    const design = await prisma.pODDesign.create({
      data: {
        dealerId: user!.dealerId || null,
        creatorUserId: user!.id,
        title,
        description,
        fileUrl: processed.fileUrl,
        previewUrl: processed.previewUrl,
        thumbnailUrl: processed.thumbnailUrl,
        fileType: processed.fileType,
        width: processed.width,
        height: processed.height,
        dpi: processed.dpi,
        transparentBackground: processed.transparentBackground,
        status: "active",
        metadataJson: JSON.stringify({
          version: "POD_DESIGNER_V1",
          fileSize: processed.fileSize,
        }),
      },
    });

    return NextResponse.json({ success: true, data: design });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yükleme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
