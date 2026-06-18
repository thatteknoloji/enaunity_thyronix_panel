import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  try {
    const user = await requireDealer();
    const quotes = await prisma.quote.findMany({
      where: { dealerId: user.dealerId! },
      include: { items: { include: { product: { select: { name: true, image: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: quotes });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    const { items, note } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: "En az bir ürün ekleyin" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i: { productId: string }) => i.productId) } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const total = items.reduce((sum: number, i: { productId: string; quantity: number }) => {
      const p = productMap.get(i.productId);
      return sum + (p?.price || 0) * i.quantity;
    }, 0);

    const quote = await prisma.quote.create({
      data: {
        dealerId: user.dealerId!,
        note: note || "",
        total,
        items: {
          create: items.map((i: { productId: string; quantity: number }) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: productMap.get(i.productId)?.price || 0,
          })),
        },
      },
      include: { items: { include: { product: { select: { name: true } } } } },
    });

    return NextResponse.json({ success: true, data: quote }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
