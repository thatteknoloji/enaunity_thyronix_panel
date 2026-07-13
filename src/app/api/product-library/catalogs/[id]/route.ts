import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const catalog = await prisma.productCatalog.findUnique({
      where: { id },
      include: {
        suppliers: { select: { id: true, name: true, status: true, type: true } },
        _count: { select: { items: true } },
      },
    });
    if (!catalog) {
      return NextResponse.json({ success: false, error: "Katalog bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: catalog });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const field of ["name", "description", "status"] as const) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    const catalog = await prisma.productCatalog.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: catalog });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
