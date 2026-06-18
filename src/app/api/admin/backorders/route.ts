import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

function checkAdmin(user: any, perm: string): boolean {
  const raw = user?.adminRole?.permissions;
  if (!raw) return false;
  try { return hasPermission(JSON.parse(raw as string), perm as any); } catch { return false; }
}

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });
    }
    if (!checkAdmin(user, "orders_backorder")) {
      return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      where: { hasBackorder: true },
      include: {
        items: {
          include: { product: true },
        },
        user: { select: { name: true, email: true } },
        dealer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const backorders = orders.map(order => {
      const backorderItems = order.items.filter(item =>
        item.product && item.productId && item.product.backorderable && item.product.stock < item.quantity
      ).map(item => ({
        id: item.id,
        productId: item.productId!,
        productName: item.product!.name,
        productImage: item.product!.image,
        productSku: item.product!.sku,
        ordered: item.quantity,
        inStock: Math.min(item.quantity, item.product!.stock),
        backorderQty: item.quantity - Math.min(item.quantity, item.product!.stock),
        eta: item.product!.eta,
        price: item.price,
      }));

      return {
        orderId: order.id,
        orderNo: order.id.slice(0, 8).toUpperCase(),
        createdAt: order.createdAt,
        status: order.status,
        total: order.total,
        user: order.user,
        dealer: order.dealer,
        items: backorderItems,
      };
    }).filter(o => o.items.length > 0);

    return NextResponse.json({ success: true, data: backorders });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
