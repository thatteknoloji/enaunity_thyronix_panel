import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const counts = await prisma.stockCount.findMany({
      include: {
        warehouse: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ success: true, data: counts });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { name, warehouseId } = await req.json();
    const count = await prisma.stockCount.create({
      data: { name, warehouseId: warehouseId || null },
    });
    return NextResponse.json({ success: true, data: count }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
