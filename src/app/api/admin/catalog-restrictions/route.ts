import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const restrictions = await prisma.catalogRestriction.findMany({
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ group: "asc" }, { product: { name: "asc" } }],
    });
    return NextResponse.json({ success: true, data: restrictions });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { group, productId } = await req.json();

    const existing = await prisma.catalogRestriction.findUnique({
      where: { group_productId: { group, productId } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu kısıtlama zaten var" }, { status: 400 });
    }

    const restriction = await prisma.catalogRestriction.create({
      data: { group, productId },
      include: { product: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: restriction }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    await prisma.catalogRestriction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
