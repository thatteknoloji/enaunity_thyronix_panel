import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const tiers = await prisma.tieredPrice.findMany({
      include: { product: { select: { name: true } } },
      orderBy: [{ productId: "asc" }, { minQuantity: "asc" }],
    });
    return NextResponse.json({ success: true, data: tiers });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const tier = await prisma.tieredPrice.create({
      data: {
        productId: body.productId,
        minQuantity: parseInt(body.minQuantity),
        price: parseFloat(body.price),
      },
    });
    return NextResponse.json({ success: true, data: tier }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    await prisma.tieredPrice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
