import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePodCreatorApiAccess } from "@/lib/pod/api-guard";
import { getPodDealerFilter, assertPodResourceOwner } from "@/lib/pod/tenant-access";
import {
  defaultPlacementForOverlay,
  normalizePlacement,
  overlayFromTemplate,
  serializePlacement,
} from "@/lib/pod/pod-design-engine";

export async function GET(req: Request) {
  try {
    const { error, user } = await requirePodCreatorApiAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10) || 20);
    const status = searchParams.get("status") || undefined;

    const where: Record<string, unknown> = { ...getPodDealerFilter(user!) };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.pODProject.findMany({
        where,
        include: {
          design: { select: { id: true, title: true, thumbnailUrl: true, fileUrl: true, width: true, height: true } },
          template: { select: { id: true, name: true, category: true, baseImageUrl: true, overlayAreaJson: true, printWidth: true, printHeight: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pODProject.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Projeler alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePodCreatorApiAccess();
    if (error) return error;

    if (!user!.dealerId) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 400 });
    }

    const body = await req.json();
    const designId = String(body.designId || "");
    const templateId = String(body.templateId || "");
    const projectId = body.projectId ? String(body.projectId) : undefined;
    const action = body.action ? String(body.action) : "save";

    if (projectId) {
      const existing = await prisma.pODProject.findUnique({
        where: { id: projectId },
        include: { template: true },
      });
      if (!existing) {
        return NextResponse.json({ success: false, error: "Proje bulunamadı" }, { status: 404 });
      }
      assertPodResourceOwner(existing.dealerId, user!);

      const placement = body.placement
        ? serializePlacement(normalizePlacement(body.placement))
        : existing.placementJson;

      const status =
        action === "store_ready"
          ? "STORE_READY"
          : action === "mockup_ready"
            ? existing.status
            : existing.status;

      const updated = await prisma.pODProject.update({
        where: { id: projectId },
        data: {
          placementJson: placement,
          status: action === "store_ready" ? "STORE_READY" : status,
          metadataJson: JSON.stringify({
            ...(JSON.parse(existing.metadataJson || "{}") as object),
            storeReadyAt: action === "store_ready" ? new Date().toISOString() : undefined,
          }),
        },
        include: { design: true, template: true },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (!designId || !templateId) {
      return NextResponse.json({ success: false, error: "designId ve templateId gerekli" }, { status: 400 });
    }

    const [design, template] = await Promise.all([
      prisma.pODDesign.findUnique({ where: { id: designId } }),
      prisma.pODProductTemplate.findUnique({ where: { id: templateId } }),
    ]);
    if (!design) return NextResponse.json({ success: false, error: "Tasarım bulunamadı" }, { status: 404 });
    if (!template) return NextResponse.json({ success: false, error: "Şablon bulunamadı" }, { status: 404 });
    assertPodResourceOwner(design.dealerId, user!);

    const overlay = overlayFromTemplate(template);
    const placementJson = body.placement
      ? serializePlacement(normalizePlacement(body.placement))
      : serializePlacement(defaultPlacementForOverlay(overlay));

    const project = await prisma.pODProject.create({
      data: {
        dealerId: user!.dealerId,
        designId,
        templateId,
        placementJson,
        status: "DRAFT",
      },
      include: { design: true, template: true },
    });

    return NextResponse.json({ success: true, data: project });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proje kaydedilemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
