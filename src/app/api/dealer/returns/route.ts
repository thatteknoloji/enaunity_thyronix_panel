import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user?.dealerId) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });

    const requests = await prisma.returnRequest.findMany({
      where: { dealerId: user.dealerId },
      include: {
        items: { include: { product: { select: { name: true, image: true } } } },
        order: { select: { id: true, total: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: requests });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user?.dealerId) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });

    const { orderId, reason, items } = await req.json();
    if (!items?.length) return NextResponse.json({ success: false, error: "En az bir ürün seçin" }, { status: 400 });

    const r = await prisma.returnRequest.create({
      data: {
        dealerId: user.dealerId,
        orderId: orderId || null,
        reason: reason || "",
        items: { create: items.map((i: any) => ({ productId: i.productId, quantity: i.quantity, price: i.price || 0 })) },
      },
    });
    return NextResponse.json({ success: true, data: r }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
