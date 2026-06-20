import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { publishContractVersion } from "@/lib/legal/acceptance";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await req.json();

    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });

    const contentChanged = data.content !== undefined && data.content !== existing.content;
    const title = data.title ?? existing.title;

    if (contentChanged) {
      await publishContractVersion(id, title, data.content);
      if (data.active !== undefined || data.type !== undefined || data.category !== undefined) {
        await prisma.contract.update({
          where: { id },
          data: {
            ...(data.active !== undefined ? { active: data.active } : {}),
            ...(data.type !== undefined ? { type: data.type } : {}),
            ...(data.category !== undefined ? { category: data.category } : {}),
          },
        });
      }
    } else {
      await prisma.contract.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.category !== undefined ? { category: data.category } : {}),
        },
      });
    }

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: "desc" }, take: 5 } },
    });
    return NextResponse.json({ success: true, data: contract });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: "desc" } } },
    });
    if (!contract) {
      return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: contract });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.contract.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
