import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizePageTemplate } from "@/lib/pages/types";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { title, slug, content, template, active, order } = await req.json();
    const page = await prisma.page.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        template: normalizePageTemplate(template),
        active,
        order,
      },
    });
    return NextResponse.json({ success: true, data: page });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ success: false, error: "Bu slug zaten kullanımda" }, { status: 400 });
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.page.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
