import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncAllMarketplaceConnections } from "@/lib/marketplaces/sync-engine";
import { telegram } from "@/lib/notifications/telegram";
import { getMarketplaceEngine, isLegacyMarketplaceEnabled } from "@/lib/marketplace-hub/config";
import { guardLegacyWrite } from "@/lib/marketplace-hub/legacy-guard";

export async function GET() {
  try {
    const [connections, orders] = await Promise.all([
      prisma.marketplaceConnection.findMany({
        include: { dealer: { select: { id: true, company: true, name: true, balance: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.marketplaceOrder.findMany({
        include: { items: true, connection: { select: { platform: true, dealer: { select: { company: true, name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { connections, orders },
      meta: {
        engine: getMarketplaceEngine(),
        legacyEnabled: isLegacyMarketplaceEnabled(),
        readonly: !isLegacyMarketplaceEnabled(),
        hubPath: "/admin/marketplace-hub",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();

    const blocked = guardLegacyWrite(action);
    if (blocked) return blocked;

    switch (action) {
      case "create": {
        const conn = await prisma.marketplaceConnection.create({
          data: {
            dealerId: params.dealerId,
            platform: params.platform || "trendyol",
            sellerId: params.sellerId,
            apiKey: params.apiKey,
            apiSecret: params.apiSecret || "",
            matchMethod: params.matchMethod || "product_name",
          },
          include: { dealer: { select: { id: true, company: true, name: true } } },
        });
        return NextResponse.json({ success: true, data: conn });
      }

      case "update": {
        const conn = await prisma.marketplaceConnection.update({
          where: { id: params.id },
          data: {
            platform: params.platform,
            sellerId: params.sellerId,
            apiKey: params.apiKey,
            apiSecret: params.apiSecret,
            active: params.active,
          },
        });
        return NextResponse.json({ success: true, data: conn });
      }

      case "toggle": {
        const conn = await prisma.marketplaceConnection.findUnique({ where: { id: params.id } });
        if (!conn) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        const updated = await prisma.marketplaceConnection.update({
          where: { id: params.id },
          data: { active: !conn.active },
        });
        return NextResponse.json({ success: true, data: updated });
      }

      case "delete": {
        await prisma.marketplaceConnection.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
      }

      case "sync": {
        const result = await syncAllMarketplaceConnections();
        return NextResponse.json({ success: true, data: result });
      }

      case "testTelegram": {
        const dealer = await prisma.dealer.findUnique({ where: { id: params.dealerId } });
        if (!dealer?.telegramChatId) {
          return NextResponse.json({ success: false, error: "Bayinin Telegram Chat ID'si tanımlı değil" }, { status: 400 });
        }
        await telegram.testConnection(dealer.telegramChatId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
