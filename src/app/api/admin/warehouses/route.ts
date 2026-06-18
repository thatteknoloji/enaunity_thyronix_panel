import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const warehouses = await prisma.warehouse.findMany({
      include: { stocks: { include: { product: { select: { name: true } } } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: warehouses });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { name, location, isDefault } = await req.json();
    if (isDefault) {
      await prisma.warehouse.updateMany({ data: { isDefault: false } });
    }
    const warehouse = await prisma.warehouse.create({ data: { name, location: location || "", isDefault: !!isDefault } });
    return NextResponse.json({ success: true, data: warehouse }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
