import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const count = await prisma.stockCount.findUnique({
      where: { id },
      include: {
        warehouse: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true, barcode: true, image: true } } } },
      },
    });
    if (!count) return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true, data: count });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    if (body.action === "add-items") {
      const count = await prisma.stockCount.findUnique({ where: { id } });
      if (!count) return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });

      const products = await prisma.product.findMany({
        select: { id: true, stock: true },
      });

      const existingItems = await prisma.stockCountItem.findMany({ where: { countId: id }, select: { productId: true } });
      const existingIds = new Set(existingItems.map((i) => i.productId));
      const newItems = products.filter((p) => !existingIds.has(p.id)).map((p) => ({
        countId: id, productId: p.id, systemStock: p.stock,
      }));

      if (newItems.length > 0) {
        await prisma.stockCountItem.createMany({ data: newItems });
      }

      return NextResponse.json({ success: true, data: { added: newItems.length } });
    }

    if (body.action === "update-stock") {
      const count = await prisma.stockCount.findUnique({ where: { id } });
      if (!count || count.status !== "in_progress") {
        return NextResponse.json({ success: false, error: "Sayaç aktif değil" }, { status: 400 });
      }
      const { itemId, actualStock, note } = body;
      const item = await prisma.stockCountItem.findUnique({ where: { id: itemId } });
      if (!item) return NextResponse.json({ success: false, error: "Kalem bulunamadı" }, { status: 404 });

      const diff = actualStock - item.systemStock;
      await prisma.stockCountItem.update({
        where: { id: itemId },
        data: { actualStock, difference: diff, note: note || "" },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "complete") {
      const items = await prisma.stockCountItem.findMany({ where: { countId: id, actualStock: { not: null } } });
      for (const item of items) {
        if (item.difference !== 0) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: item.actualStock! },
          });
          await prisma.stockMovement.create({
            data: {
              productId: item.productId,
              type: item.difference > 0 ? "entry" : "exit",
              quantity: Math.abs(item.difference),
              note: `Stok sayımı #${id.slice(0, 8)} (${item.difference > 0 ? "fazla" : "eksik"})`,
            },
          });
        }
      }
      await prisma.stockCount.update({ where: { id }, data: { status: "completed" } });
      return NextResponse.json({ success: true, data: { adjusted: items.filter((i) => i.difference !== 0).length } });
    }

    if (body.action === "status") {
      await prisma.stockCount.update({ where: { id }, data: { status: body.status } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Bilinmeyen işlem" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
