import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const item = await prisma.footerLegalStripItem.update({
      where: { id },
      data: {
        label: body.label !== undefined ? String(body.label).trim() : undefined,
        imageUrl: body.imageUrl !== undefined ? String(body.imageUrl).trim() : undefined,
        linkUrl: body.linkUrl !== undefined ? String(body.linkUrl).trim() : undefined,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
        active: typeof body.active === "boolean" ? body.active : undefined,
      },
    });
    return NextResponse.json({ success: true, data: item });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.footerLegalStripItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
