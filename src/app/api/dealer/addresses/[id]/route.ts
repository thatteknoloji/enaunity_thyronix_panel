import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.address.findFirst({
      where: { id, dealerId: user.dealerId! },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Adres bulunamadı" }, { status: 404 });
    }

    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { dealerId: user.dealerId!, type: body.type || existing.type, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({ where: { id }, data: body });
    return NextResponse.json({ success: true, data: address });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDealer();
    const { id } = await params;

    const existing = await prisma.address.findFirst({
      where: { id, dealerId: user.dealerId! },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Adres bulunamadı" }, { status: 404 });
    }

    await prisma.address.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
