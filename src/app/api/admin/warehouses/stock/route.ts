import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { productId, warehouseId, stock } = await req.json();
    const pw = await prisma.productWarehouse.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      update: { stock },
      create: { productId, warehouseId, stock },
    });
    return NextResponse.json({ success: true, data: pw });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
