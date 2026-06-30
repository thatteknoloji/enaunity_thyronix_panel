import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordCartActivity } from "@/lib/cart/cart-observer-service";

export async function GET() {
  try {
    const user = await getSession();
    if (!user || !user.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const carts = await prisma.savedCart.findMany({
      where: { dealerId: user.dealerId },
      include: { items: { include: { product: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: carts });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user || !user.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { name, items } = await req.json();
    if (!name || !items?.length) {
      return NextResponse.json({ success: false, error: "Gerekli alanları doldurun" }, { status: 400 });
    }

    const cart = await prisma.savedCart.create({
      data: {
        dealerId: user.dealerId,
        name,
        total: items.reduce((s: number, i: any) => s + (i.price || 0) * i.quantity, 0),
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    const liveCart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (liveCart) {
      await recordCartActivity({
        cartId: liveCart.id,
        userId: user.id,
        dealerId: user.dealerId,
        eventType: "saved_cart_created",
        metadata: {
          savedCartId: cart.id,
          savedCartName: cart.name,
        },
        touchCart: false,
      });
    }

    return NextResponse.json({ success: true, data: cart });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
