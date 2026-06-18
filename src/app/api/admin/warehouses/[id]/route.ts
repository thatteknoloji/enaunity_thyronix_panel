import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.productWarehouse.deleteMany({ where: { warehouseId: id } });
    await prisma.warehouse.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { name, location, isDefault } = await req.json();
    if (isDefault) {
      await prisma.warehouse.updateMany({ data: { isDefault: false } });
    }
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: { name, location, isDefault: !!isDefault },
    });
    return NextResponse.json({ success: true, data: warehouse });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
