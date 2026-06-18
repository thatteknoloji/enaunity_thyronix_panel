import { prisma } from "@/lib/db";
import { getPlatformClient, type TrendyolPackage } from "./trendyol";
import { telegram } from "@/lib/notifications/telegram";
import { isLegacyMarketplaceEnabled } from "@/lib/marketplace-hub/config";
import { logLegacySyncSkipped } from "@/lib/marketplace-hub/legacy-guard";

interface MatchedProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  category: string;
  sku: string;
  barcode: string;
}

function fuzzyMatch(lineName: string, productName: string): number {
  const l = lineName.toLowerCase().replace(/[^a-z0-9ğüşıöç ]/g, " ").replace(/\s+/g, " ").trim();
  const p = productName.toLowerCase().replace(/[^a-z0-9ğüşıöç ]/g, " ").replace(/\s+/g, " ").trim();

  if (p.length < 5 || l.length < 5) return 0;

  const lWords = l.split(" ").filter(w => w.length >= 3);
  const pWords = p.split(" ").filter(w => w.length >= 3);

  let score = 0;
  for (const lw of lWords) {
    for (const pw of pWords) {
      if (lw === pw) score += 3;
      else if (lw.includes(pw) || pw.includes(lw)) score += 1;
    }
  }

  return score;
}

function detectCategory(lineName: string): string {
  const categories: Record<string, string[]> = {
    "Cam Tablo": ["cam tablo", "camtablo", "kırılmaz cam", "cam baskı"],
    "Mdf Tablo": ["mdf tablo", "çerçeveli", "kanvas"],
    "Puzzle": ["puzzle", "yapboz"],
    "Halı": ["halı", "kilim", "yolluk"],
    "Perde": ["perde"],
    "Nevresim": ["nevresim"],
  };
  const lower = lineName.toLowerCase();
  for (const [cat, keys] of Object.entries(categories)) {
    if (keys.some(k => lower.includes(k))) return cat;
  }
  return "";
}

function getPlaceholderImage(category: string): string {
  const map: Record<string, string> = {
    "Cam Tablo": "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=400&fit=crop",
    "Mdf Tablo": "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&h=400&fit=crop",
    "Puzzle": "https://images.unsplash.com/photo-1580541832628-2a7131ee809f?w=400&h=400&fit=crop",
    "Halı": "https://images.unsplash.com/photo-1600166898405-da9535204843?w=400&h=400&fit=crop",
    "Perde": "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400&h=400&fit=crop",
    "Nevresim": "https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=400&h=400&fit=crop",
  };
  return map[category] || "";
}

export async function syncAllMarketplaceConnections() {
  if (!isLegacyMarketplaceEnabled()) {
    await logLegacySyncSkipped();
    return {
      skipped: true,
      reason: "LEGACY_DISABLED",
      engine: "hub",
      connections: 0,
      totalPulled: 0,
      totalSkipped: 0,
      totalProcessed: 0,
      totalPending: 0,
      totalMatched: 0,
    };
  }

  const connections = await prisma.marketplaceConnection.findMany({
    where: { active: true },
    include: { dealer: true },
  });

  let totalPulled = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;
  let totalPending = 0;
  let totalMatched = 0;

  for (const conn of connections) {
    const client = await getPlatformClient({
      platform: conn.platform,
      sellerId: conn.sellerId,
      apiKey: conn.apiKey,
      apiSecret: conn.apiSecret,
    });

    const connWithSecret = {
      sellerId: conn.sellerId,
      apiKey: conn.apiKey,
      apiSecret: conn.apiSecret,
    };

    const allProducts = await prisma.product.findMany({
      select: { id: true, name: true, image: true, price: true, category: true, sku: true, barcode: true },
      take: 500,
    });

    let orders: TrendyolPackage[] = [];
    try {
      orders = await client.getAllNewPackages(connWithSecret, conn.lastSyncAt);
    } catch (err: any) {
      console.error(`[Sync] ${conn.platform}/${conn.sellerId}: ${err.message}`);
      continue;
    }

    for (const pkg of orders) {
      const orderId = pkg.orderNumber;

      const existing = await prisma.marketplaceOrder.findFirst({
        where: { connectionId: conn.id, platformOrderId: orderId },
      });
      if (existing) { totalSkipped++; continue; }

      const addr = pkg.shipmentAddress;

      const enrichedLines: any[] = [];
      for (const line of pkg.lines) {
        const lineName = (line.productName || "").trim();
        const lineBarcode = (line.barcode || "").trim();

        let matched: MatchedProduct | null = null;
        let bestScore = 0;

        if (conn.matchMethod === "barcode" && lineBarcode) {
          matched = allProducts.find(
            (p) => p.barcode === lineBarcode || p.sku === lineBarcode
          ) || null;
        }

        if (!matched && conn.matchMethod === "category") {
          for (const p of allProducts) {
            const word = lineName.split(" ").find(w => w.length > 3 && p.category?.toLowerCase().includes(w.toLowerCase()));
            if (word) { matched = p; break; }
          }
        }

        if (!matched) {
          for (const p of allProducts) {
            const s = fuzzyMatch(lineName, p.name);
            if (s > bestScore) { bestScore = s; matched = p; }
          }
          if (bestScore < 2) matched = null;
        }

        const detectedCat = detectCategory(lineName);
        const img = matched?.image || getPlaceholderImage(detectedCat);

        if (matched) totalMatched++;

        enrichedLines.push({
          productName: matched?.name || lineName,
          barcode: matched?.barcode || lineBarcode,
          quantity: line.quantity || 1,
          unitPrice: line.price || line.amount || 0,
          total: (line.price || line.amount || 0) * (line.quantity || 1),
          productImage: img,
          productCategory: matched?.category || detectedCat,
          productSku: matched?.sku || lineBarcode,
          matchedProductId: matched?.id || "",
          originalProductName: matched ? lineName : "",
        });
      }

      const totalAmount = enrichedLines.reduce((s, l) => s + l.total, 0);

      const order = await prisma.marketplaceOrder.create({
        data: {
          connectionId: conn.id,
          platform: conn.platform,
          platformOrderId: orderId,
          customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim() || (addr as any).fullName || "",
          customerPhone: (addr as any).phoneNumber || (addr as any).phone || "",
          customerAddress: (addr as any).addressDetail || addr.address1 || "",
          customerCity: `${addr.city || ""} / ${addr.district || ""}`,
          totalAmount: totalAmount + (pkg.totalDiscount || 0),
          status: "new",
          items: { create: enrichedLines },
        },
      });

      totalPulled++;

      const dealer = conn.dealer;
      const balance = dealer.balance;
      const missingBalance = totalAmount - balance;

      if (balance >= totalAmount) {
        await prisma.$transaction([
          prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: { status: "processing", processed: true },
          }),
          prisma.dealer.update({
            where: { id: dealer.id },
            data: { balance: { decrement: totalAmount } },
          }),
        ]);

        totalProcessed++;

        try {
          await client.updatePackageStatus(connWithSecret, orderId,
            pkg.lines.map(l => ({ lineItemId: l.lineId || 0, quantity: l.quantity || 1 }))
          );
          await prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: { status: "completed" },
          });
        } catch {
          await prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: { status: "awaiting_status" },
          });
        }

        if (dealer.telegramChatId) {
          await telegram.notifyNewOrder({
            chatId: dealer.telegramChatId,
            platform: conn.platform,
            orderId,
            customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
            totalAmount,
            items: enrichedLines.map(l => ({
              name: `${l.productCategory ? "[" + l.productCategory + "] " : ""}${l.productName}`,
              qty: l.quantity,
              price: l.unitPrice,
            })),
          }).catch(() => {});
        }
      } else {
        await prisma.marketplaceOrder.update({
          where: { id: order.id },
          data: { status: "pending_payment" },
        });
        totalPending++;

        if (dealer.telegramChatId) {
          await telegram.notifyNewOrder({
            chatId: dealer.telegramChatId,
            platform: conn.platform,
            orderId,
            customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
            totalAmount,
            items: enrichedLines.map(l => ({
              name: `${l.productCategory ? "[" + l.productCategory + "] " : ""}${l.productName}`,
              qty: l.quantity,
              price: l.unitPrice,
            })),
            missingBalance,
          }).catch(() => {});
        }
      }
    }

    await prisma.marketplaceConnection.update({
      where: { id: conn.id },
      data: { lastSyncAt: new Date() },
    });
  }

  return {
    connections: connections.length,
    totalPulled,
    totalSkipped,
    totalProcessed,
    totalPending,
    totalMatched,
  };
}
