import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  try {
    await requireAdmin();
    const movements = await prisma.stockMovement.findMany({
      include: { product: { select: { name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ success: true, data: movements });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { productId, type, quantity, note } = await req.json();
    const movement = await prisma.stockMovement.create({
      data: { productId, type, quantity: Math.abs(quantity), note },
    });
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { stock: type === "entry" ? { increment: quantity } : { decrement: quantity } },
    });

    const warnings: string[] = [];

    if (updated.minStockLevel > 0 && updated.stock <= updated.minStockLevel && updated.stock > 0) {
      warnings.push(`"${updated.name}" stoku kritik seviyede (${updated.stock} ≤ ${updated.minStockLevel})`);
      await createNotification({
        title: "Kritik Stok",
        message: `"${updated.name}" stoku kritik seviyede: ${updated.stock} adet (min: ${updated.minStockLevel})`,
        type: "warning",
        link: `/admin/products`,
      });
    }

    if (updated.maxStockLevel > 0 && updated.stock >= updated.maxStockLevel) {
      warnings.push(`"${updated.name}" stoku maksimum seviyeyi aştı (${updated.stock} ≥ ${updated.maxStockLevel})`);
      await createNotification({
        title: "Stok Uyarısı",
        message: `"${updated.name}" stoku maksimum seviyeye ulaştı: ${updated.stock} adet (max: ${updated.maxStockLevel})`,
        type: "warning",
        link: `/admin/products`,
      });
    }

    if (updated.stock === 0) {
      warnings.push(`"${updated.name}" stokta tükendi`);
      await createNotification({
        title: "Stok Tükendi",
        message: `"${updated.name}" ürünü stokta tükendi`,
        type: "warning",
        link: `/admin/products`,
      });
    }

    return NextResponse.json({ success: true, data: movement, warnings }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
