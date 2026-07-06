import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const feed = await prisma.productXmlFeed.findUnique({
      where: { id },
      include: {
        syncLogs: { orderBy: { createdAt: "desc" }, take: 20 },
        _count: { select: { productLinks: true } },
      },
    });
    if (!feed) {
      return NextResponse.json({ success: false, error: "Feed bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: feed });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Detay hatası" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.name != null) data.name = String(body.name).trim();
    if (body.feedUrl != null) data.feedUrl = String(body.feedUrl).trim();
    if (body.rootCategory != null) data.rootCategory = String(body.rootCategory).trim();
    if (body.templateId != null) data.templateId = String(body.templateId).trim();
    if (body.status != null) data.status = String(body.status).trim();
    if (body.syncIntervalHours != null) data.syncIntervalHours = Number(body.syncIntervalHours);
    if (body.mappingJson != null) data.mappingJson = JSON.stringify(body.mappingJson);
    if (body.variantMappingJson != null) data.variantMappingJson = JSON.stringify(body.variantMappingJson);
    if (body.categoryMappingJson != null) data.categoryMappingJson = JSON.stringify(body.categoryMappingJson);
    if (body.rulesJson != null) data.rulesJson = JSON.stringify(body.rulesJson);

    const feed = await prisma.productXmlFeed.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: feed });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Güncelleme hatası" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    await prisma.productXmlFeed.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Silme hatası" },
      { status: 500 },
    );
  }
}
