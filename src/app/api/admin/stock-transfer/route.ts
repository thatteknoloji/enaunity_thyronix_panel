import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { productId, fromWarehouseId, toWarehouseId, quantity } = await req.json();

    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity || quantity < 1) {
      return NextResponse.json({ success: false, error: "Geçersiz parametreler" }, { status: 400 });
    }
    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json({ success: false, error: "Kaynak ve hedef depo aynı olamaz" }, { status: 400 });
    }

    const fromStock = await prisma.productWarehouse.findUnique({
      where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } },
    });
    if (!fromStock || fromStock.stock < quantity) {
      return NextResponse.json({ success: false, error: "Yetersiz stok" }, { status: 400 });
    }

    await prisma.productWarehouse.update({
      where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } },
      data: { stock: { decrement: quantity } },
    });

    await prisma.productWarehouse.upsert({
      where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
      update: { stock: { increment: quantity } },
      create: { productId, warehouseId: toWarehouseId, stock: quantity },
    });

    await prisma.stockMovement.create({
      data: {
        productId,
        type: "exit",
        quantity,
        note: `Depo transferi: ${fromWarehouseId.slice(0, 8)} → ${toWarehouseId.slice(0, 8)}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { barcode: { contains: query } },
          { sku: { contains: query } },
          { name: { contains: query } },
          { modelCode: { contains: query } },
        ],
      },
      select: {
        id: true, name: true, sku: true, barcode: true, stock: true, modelCode: true, image: true,
        warehouseStocks: { include: { warehouse: { select: { id: true, name: true } } } },
      },
      take: 20,
    });

    return NextResponse.json({ success: true, data: products });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
