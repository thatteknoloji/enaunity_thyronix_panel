import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isCoreOrderEngine } from "@/lib/orders/config";
import { listCoreOrders } from "@/lib/orders/core-order-service";

function normalizeCoreOrder(o: any) {
  return {
    ...o,
    engine: "core",
    metadataJson: o.metadataJson || "{}",
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
    metadataJson: o.metadataJson || "{}",
    displayStatus: o.status,
    items: (o.items || []).map((i: any) => ({
      id: i.id,
      quantity: i.quantity,
      price: i.salePrice,
      product: { name: i.name, image: "/placeholder.svg" },
    })),
  };
}

function matchesDealerOrderSearch(order: any, rawSearch: string) {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return true;
  const haystack = [
    order.id,
    order.orderNumber,
    order.marketplaceOrderId,
    order.customerName,
    order.customerPhone,
    order.customerCity,
    order.address,
    order.marketplace,
    ...(order.items || []).flatMap((item: any) => [
      item?.name,
      item?.sku,
      item?.barcode,
      item?.product?.name,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search);
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
    const search = searchParams.get("search") || "";

    if (isCoreOrderEngine()) {
      const coreOrders = await listCoreOrders({
        dealerId: user.dealerId,
        fulfillmentStatus,
        sourceType,
        marketplace,
        search,
        limit: 200,
      });

      const legacyOrders = await prisma.dealerOrder.findMany({
        where: {
          dealerId: user.dealerId,
          ...(sourceType ? { sourceType } : {}),
          ...(fulfillmentStatus ? { status: fulfillmentStatus } : {}),
          ...(marketplace ? { marketplace } : {}),
          ...(search
            ? {
                OR: [
                  { id: { contains: search } },
                  { orderNumber: { contains: search } },
                  { marketplaceOrderId: { contains: search } },
                  { customerName: { contains: search } },
                  { customerPhone: { contains: search } },
                  { customerCity: { contains: search } },
                  {
                    items: {
                      some: {
                        OR: [
                          { name: { contains: search } },
                          { sku: { contains: search } },
                          { barcode: { contains: search } },
                        ],
                      },
                    },
                  },
                ],
              }
            : {}),
        },
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
      ]
        .filter((order) => matchesDealerOrderSearch(order, search))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({ success: true, data, engine: "core" });
    }

    const orders = await prisma.order.findMany({
      where: {
        dealerId: user.dealerId,
        ...(sourceType ? { sourceType } : {}),
        ...(fulfillmentStatus ? { OR: [{ status: fulfillmentStatus }, { fulfillmentStatus }] } : {}),
        ...(marketplace ? { marketplace } : {}),
        ...(search
          ? {
              OR: [
                { id: { contains: search } },
                { orderNumber: { contains: search } },
                { marketplaceOrderId: { contains: search } },
                { customerName: { contains: search } },
                { customerPhone: { contains: search } },
                { customerCity: { contains: search } },
                {
                  items: {
                    some: {
                      OR: [
                        { name: { contains: search } },
                        { sku: { contains: search } },
                        { barcode: { contains: search } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: { items: { include: { product: true, productCatalogItem: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: orders.map(normalizeCoreOrder).filter((order) => matchesDealerOrderSearch(order, search)),
      engine: "legacy",
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
