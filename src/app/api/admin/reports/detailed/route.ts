import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const category = searchParams.get("category");
    const productId = searchParams.get("productId");

    const where: Record<string, unknown> = {};
    if (start || end) {
      const dateFilter: Record<string, Date> = {};
      if (start) dateFilter.gte = new Date(start);
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.lte = endDate;
      }
      where.createdAt = dateFilter;
    }

    if (productId) {
      const itemsWithOrder = await prisma.orderItem.findMany({
        where: { productId },
        select: { orderId: true },
      });
      where.id = { in: itemsWithOrder.map(i => i.orderId) };
    }

    const orders = await (prisma as any).order.findMany({
      where,
      select: {
        id: true,
        total: true,
        discount: true,
        status: true,
        createdAt: true,
        dealerId: true,
        dealer: { select: { name: true, company: true } },
        items: {
          select: {
            quantity: true,
            price: true,
            product: { select: { name: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const data = (orders as any[]).map((o: any) => ({
      id: o.id,
      total: o.total,
      discount: o.discount,
      status: o.status,
      createdAt: o.createdAt,
      dealerName: o.dealer?.name || "Silinmiş",
      dealerCompany: o.dealer?.company || "",
      items: (o.items || []).map((i: any) => ({
        quantity: i.quantity,
        price: i.price,
        productName: i.product?.name || "Silinmiş",
        category: i.product?.category || "",
      })),
    }));

    const filtered = category
      ? data.filter(o => o.items.some((i: any) => i.category === category))
      : data;

    return NextResponse.json({ success: true, data: filtered });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
