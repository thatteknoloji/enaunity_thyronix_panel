import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user?.dealerId) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });

    const carts = await prisma.savedCart.findMany({
      where: { dealerId: user.dealerId },
      include: { items: { include: { product: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: carts.map((c) => ({
        id: c.id,
        name: c.name,
        total: c.total,
        items: c.items.map((i) => ({ id: i.productId, name: i.product.name, quantity: i.quantity, image: i.product.image })),
        createdAt: c.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
