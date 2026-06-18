import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isCoreOrderEngine } from "@/lib/orders/config";
import { listCoreOrders } from "@/lib/orders/core-order-service";

function normalizeCoreOrder(o: any) {
  return {
    ...o,
    engine: "core",
    displayStatus: o.fulfillmentStatus || o.status,
    items: (o.items || []).map((i: any) => ({
      ...i,
      product: i.product || {
        name: i.name || i.productCatalogItem?.name || "Ürün",
        image: i.productCatalogItem?.imagesJson ? "" : "/placeholder.svg",
      },
    })),
  };
}

function normalizeLegacyOrder(o: any) {
  return {
    id: o.id,
    total: o.totalAmount,
    status: o.status,
    fulfillmentStatus: o.status,
    sourceType: o.sourceType,
    marketplace: o.marketplace,
    marketplaceOrderId: o.marketplaceOrderId,
    orderNumber: o.orderNumber,
    address: [o.customerName, o.customerCity].filter(Boolean).join(", "),
    createdAt: o.createdAt,
    engine: "legacy_dealer_order",
    displayStatus: o.status,
    items: (o.items || []).map((i: any) => ({
      id: i.id,
      quantity: i.quantity,
      price: i.salePrice,
      product: { name: i.name, image: "/placeholder.svg" },
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !user.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sourceType = searchParams.get("sourceType") || undefined;
    const fulfillmentStatus = searchParams.get("fulfillmentStatus") || searchParams.get("status") || undefined;
    const marketplace = searchParams.get("marketplace") || undefined;

    if (isCoreOrderEngine()) {
      const coreOrders = await listCoreOrders({
        dealerId: user.dealerId,
        fulfillmentStatus,
        sourceType,
        marketplace,
        limit: 200,
      });

      const legacyOrders = await prisma.dealerOrder.findMany({
        where: { dealerId: user.dealerId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const coreMpIds = new Set(
        coreOrders.map((o) => `${o.marketplace}|${o.marketplaceOrderId}`).filter((k) => !k.endsWith("|"))
      );
      const legacyOnly = legacyOrders.filter(
        (o) => !coreMpIds.has(`${o.marketplace}|${o.marketplaceOrderId}`)
      );

      const data = [
        ...coreOrders.map(normalizeCoreOrder),
        ...legacyOnly.map(normalizeLegacyOrder),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({ success: true, data, engine: "core" });
    }

    const orders = await prisma.order.findMany({
      where: { dealerId: user.dealerId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: orders, engine: "legacy" });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
