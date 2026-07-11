import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const configs = await prisma.shippingConfig.findMany({
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ type: "asc" }, { category: "asc" }],
    });
    return NextResponse.json({ success: true, data: configs });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const data = await req.json();
    const config = await prisma.shippingConfig.create({ data });
    return NextResponse.json({ success: true, data: config });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, ...data } = await req.json();
    await prisma.shippingConfig.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    await prisma.shippingConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
