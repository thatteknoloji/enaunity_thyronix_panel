import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncConnection } from "@/lib/marketplace-hub/sync";

async function getDealerId(req: NextRequest): Promise<string | null> {
  const headerId = req.headers.get("x-dealer-id");
  if (headerId) return headerId;
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return payload.dealerId || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const dealerId = await getDealerId(req);
    if (!dealerId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const type = req.nextUrl.searchParams.get("type") || "connections";
    if (type === "orders") {
      const orders = await prisma.dealerOrder.findMany({
        where: {
          dealerId,
          sourceType: { in: ["MARKETPLACE", "MARKETPLACE_HUB"] },
        },
        include: { items: true, shipments: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ success: true, data: orders });
    }

    const connections = await prisma.marketplaceConnection.findMany({
      where: { dealerId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ success: true, data: connections });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const dealerId = await getDealerId(req);
    if (!dealerId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    if (body.action === "create") {
      const conn = await prisma.marketplaceConnection.create({
        data: {
          dealerId,
          platform: (body.platform || "TRENDYOL").toUpperCase(),
          sellerId: body.sellerId || body.supplierId || "",
          storeId: body.storeId || "",
          supplierId: body.supplierId || "",
          apiKey: body.apiKey,
          apiSecret: body.apiSecret || "",
          connectionStatus: "CONNECTED",
          active: true,
        },
      });
      return NextResponse.json({ success: true, data: conn });
    }

    if (body.action === "sync" && body.connectionId) {
      const conn = await prisma.marketplaceConnection.findFirst({
        where: { id: body.connectionId, dealerId },
      });
      if (!conn) return NextResponse.json({ success: false, error: "Bağlantı bulunamadı" }, { status: 404 });
      const result = await syncConnection(conn.id);
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "delete") {
      await prisma.marketplaceConnection.delete({ where: { id: body.id, dealerId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Bilinmeyen işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
