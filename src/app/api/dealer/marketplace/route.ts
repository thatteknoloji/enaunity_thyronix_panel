import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMarketplaceEngine, isLegacyMarketplaceEnabled } from "@/lib/marketplace-hub/config";
import { guardLegacyWrite } from "@/lib/marketplace-hub/legacy-guard";
import { syncConnection } from "@/lib/marketplace-hub/sync";

async function getDealerId(req: NextRequest): Promise<string | null> {
  const headerId = req.headers.get("x-dealer-id");
  if (headerId) return headerId;

  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    return payload.dealerId || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const dealerId = await getDealerId(req);
    if (!dealerId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const [connections, orders] = await Promise.all([
      prisma.marketplaceConnection.findMany({
        where: { dealerId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.marketplaceOrder.findMany({
        where: { connection: { dealerId } },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { telegramChatId: true, balance: true },
    });

    return NextResponse.json({
      success: true,
      data: { connections, orders, dealer },
      meta: {
        engine: getMarketplaceEngine(),
        legacyEnabled: isLegacyMarketplaceEnabled(),
        hubApi: "/api/dealer/marketplace-hub",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const dealerId = await getDealerId(req);
    if (!dealerId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    if (!isLegacyMarketplaceEnabled()) {
      return handleHubCompatibleDealerAction(dealerId, body);
    }

    const blocked = guardLegacyWrite(body.action);
    if (blocked) return blocked;

    if (body.action === "create") {
      const conn = await prisma.marketplaceConnection.create({
        data: {
          dealerId,
          platform: body.platform || "trendyol",
          sellerId: body.sellerId,
          apiKey: body.apiKey,
          apiSecret: body.apiSecret || "",
          matchMethod: body.matchMethod || "product_name",
        },
      });
      return NextResponse.json({ success: true, data: conn });
    }

    if (body.action === "update") {
      const conn = await prisma.marketplaceConnection.update({
        where: { id: body.id, dealerId },
        data: {
          platform: body.platform,
          sellerId: body.sellerId,
          apiKey: body.apiKey,
          apiSecret: body.apiSecret,
          active: body.active,
        },
      });
      return NextResponse.json({ success: true, data: conn });
    }

    if (body.action === "delete") {
      await prisma.marketplaceConnection.delete({ where: { id: body.id, dealerId } });
      return NextResponse.json({ success: true });
    }

    if (body.action === "saveTelegram") {
      await prisma.dealer.update({
        where: { id: dealerId },
        data: { telegramChatId: body.telegramChatId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

async function handleHubCompatibleDealerAction(dealerId: string, body: Record<string, unknown>) {
  const action = String(body.action || "");

  if (action === "create") {
    const conn = await prisma.marketplaceConnection.create({
      data: {
        dealerId,
        platform: String(body.platform || "TRENDYOL").toUpperCase(),
        sellerId: String(body.sellerId || ""),
        apiKey: String(body.apiKey || ""),
        apiSecret: String(body.apiSecret || ""),
        matchMethod: String(body.matchMethod || "product_name"),
        connectionStatus: "CONNECTED",
        active: true,
      },
    });
    return NextResponse.json({ success: true, data: conn, meta: { engine: "hub" } });
  }

  if (action === "update") {
    const conn = await prisma.marketplaceConnection.update({
      where: { id: String(body.id), dealerId },
      data: {
        platform: body.platform ? String(body.platform).toUpperCase() : undefined,
        sellerId: body.sellerId ? String(body.sellerId) : undefined,
        apiKey: body.apiKey ? String(body.apiKey) : undefined,
        apiSecret: body.apiSecret ? String(body.apiSecret) : undefined,
        active: typeof body.active === "boolean" ? body.active : undefined,
      },
    });
    return NextResponse.json({ success: true, data: conn, meta: { engine: "hub" } });
  }

  if (action === "delete") {
    await prisma.marketplaceConnection.delete({ where: { id: String(body.id), dealerId } });
    return NextResponse.json({ success: true, meta: { engine: "hub" } });
  }

  if (action === "sync" && body.connectionId) {
    const conn = await prisma.marketplaceConnection.findFirst({
      where: { id: String(body.connectionId), dealerId },
    });
    if (!conn) return NextResponse.json({ success: false, error: "Bağlantı bulunamadı" }, { status: 404 });
    const result = await syncConnection(conn.id);
    return NextResponse.json({ success: true, data: result, meta: { engine: "hub" } });
  }

  if (action === "saveTelegram") {
    await prisma.dealer.update({
      where: { id: dealerId },
      data: { telegramChatId: String(body.telegramChatId || "") },
    });
    return NextResponse.json({ success: true, meta: { engine: "hub" } });
  }

  return NextResponse.json(
    {
      success: false,
      error: "Legacy marketplace devre dışı. /api/dealer/marketplace-hub kullanın.",
      code: "LEGACY_MARKETPLACE_DISABLED",
      redirectTo: "/api/dealer/marketplace-hub",
    },
    { status: 410 }
  );
}
