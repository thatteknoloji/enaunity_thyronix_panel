import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  canAccessMapping,
  getAccessibleSourceIds,
  mappingListFilter,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const sourceIds = await getAccessibleSourceIds(user);
    const items = await prisma.thyronixCategoryMapping.findMany({
      where: mappingListFilter(user, sourceIds),
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: items });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    if (!(await canAccessMapping(user, body.sourceId))) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }
    const item = await prisma.thyronixCategoryMapping.create({ data: body });
    const affected = await prisma.thyronixProduct.updateMany({
      where: withTenantFilter(user, {
        category: body.sourceCategory,
        ...(body.sourceId ? { sourceId: body.sourceId } : {}),
      }),
      data: { category: body.targetCategory },
    });
    await prisma.thyronixCategoryMapping.update({ where: { id: item.id }, data: { affectedCount: affected.count } });
    return NextResponse.json({ success: true, data: item });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id } = await req.json();
    const row = await prisma.thyronixCategoryMapping.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ success: false, error: "Kayıt bulunamadı" }, { status: 404 });
    if (!(await canAccessMapping(user, row.sourceId))) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }
    await prisma.thyronixCategoryMapping.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id, ...data } = await req.json();
    const row = await prisma.thyronixCategoryMapping.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ success: false, error: "Kayıt bulunamadı" }, { status: 404 });
    if (!(await canAccessMapping(user, row.sourceId))) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }
    const item = await prisma.thyronixCategoryMapping.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: item });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
