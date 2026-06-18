import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const prices = await prisma.dealerPrice.findMany({
      include: {
        dealer: { select: { id: true, company: true, name: true, group: true } },
        product: { select: { id: true, name: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: prices });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { dealerId, productId, price } = await req.json();
    if (!dealerId || !productId || !price) {
      return NextResponse.json({ success: false, error: "Tüm alanlar gerekli" }, { status: 400 });
    }
    const dp = await prisma.dealerPrice.create({
      data: { dealerId, productId, price: parseFloat(price) },
    });
    return NextResponse.json({ success: true, data: dp });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ success: false, error: "Bu bayi-ürün için zaten fiyat tanımlı" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, price } = await req.json();
    await prisma.dealerPrice.update({ where: { id }, data: { price: parseFloat(price) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    await prisma.dealerPrice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
