import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncConnection, syncAllConnections } from "@/lib/marketplace-hub/sync";
import { getPickList, bulkUpdateStatus, getMarketplaceReports } from "@/lib/marketplace-hub/operations";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "connections";

    if (type === "sync-logs") {
      const logs = await prisma.marketplaceSyncLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { connection: { include: { dealer: { select: { name: true, company: true } } } } },
      });
      return NextResponse.json({ success: true, data: logs });
    }

    if (type === "webhooks") {
      const events = await prisma.marketplaceWebhookEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ success: true, data: events });
    }

    if (type === "orders") {
      const orders = await prisma.marketplaceOrder.findMany({
        include: { items: true, connection: { include: { dealer: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return NextResponse.json({ success: true, data: orders });
    }

    if (type === "pick-list") {
      return NextResponse.json({ success: true, data: await getPickList() });
    }

    if (type === "reports") {
      return NextResponse.json({
        success: true,
        data: await getMarketplaceReports({
          marketplace: searchParams.get("marketplace") || undefined,
        }),
      });
    }

    const connections = await prisma.marketplaceConnection.findMany({
      include: { dealer: { select: { id: true, name: true, company: true } }, _count: { select: { orders: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ success: true, data: connections });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (body.action === "sync") {
      if (body.connectionId) {
        const result = await syncConnection(body.connectionId);
        return NextResponse.json({ success: true, data: result });
      }
      const result = await syncAllConnections();
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "create") {
      const conn = await prisma.marketplaceConnection.create({
        data: {
          dealerId: body.dealerId,
          platform: (body.platform || "TRENDYOL").toUpperCase(),
          sellerId: body.sellerId || body.supplierId || "",
          storeId: body.storeId || "",
          supplierId: body.supplierId || body.sellerId || "",
          apiKey: body.apiKey,
          apiSecret: body.apiSecret || "",
          matchMethod: body.matchMethod || "product_name",
          connectionStatus: "CONNECTED",
          active: true,
        },
      });
      return NextResponse.json({ success: true, data: conn });
    }

    if (body.action === "bulk-status") {
      const results = await bulkUpdateStatus(body.orderIds || [], body.status);
      return NextResponse.json({ success: true, data: results });
    }

    if (body.action === "pack") {
      const results = await bulkUpdateStatus(body.orderIds || [], "WAITING_FOR_SHIPMENT");
      return NextResponse.json({ success: true, data: results });
    }

    return NextResponse.json({ success: false, error: "Bilinmeyen işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
