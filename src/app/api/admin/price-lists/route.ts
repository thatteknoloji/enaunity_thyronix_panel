import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const entries = await prisma.priceList.findMany({
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ group: "asc" }, { product: { name: "asc" } }],
    });
    return NextResponse.json({ success: true, data: entries });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { group, productId, price } = await req.json();

    const existing = await prisma.priceList.findUnique({
      where: { group_productId: { group, productId } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu ürün için zaten fiyat tanımlanmış" }, { status: 400 });
    }

    const entry = await prisma.priceList.create({
      data: { group, productId, price: parseFloat(price) },
      include: { product: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { id, price } = await req.json();

    await prisma.priceList.update({
      where: { id },
      data: { price: parseFloat(price) },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    await prisma.priceList.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
