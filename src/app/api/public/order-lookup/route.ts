import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (!id || !email) {
      return Response.json({ success: false, error: "Sipariş ID ve e-posta gerekli" }, { status: 400 });
    }

    const order = await prisma.storeOrder.findUnique({
      where: { id },
      include: { store: { select: { name: true, slug: true } } },
    });

    if (!order || order.customerEmail.toLowerCase() !== email.toLowerCase()) {
      return Response.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        itemsJson: order.itemsJson,
        customerName: order.customerName,
        shippingAddress: order.shippingAddress,
        city: order.city,
        district: order.district,
        trackingCode: order.trackingCode,
        carrierName: order.carrierName,
        notes: order.notes,
        createdAt: order.createdAt,
        storeName: order.store.name,
        storeSlug: order.store.slug,
      },
    });
  } catch {
    return Response.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
