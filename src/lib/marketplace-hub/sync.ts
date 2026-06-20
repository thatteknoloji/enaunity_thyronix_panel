import { prisma } from "@/lib/db";
import { getMarketplaceEngine } from "./config";
import { importMarketplaceOrderToFulfillment } from "./import-engine";
import { fetchTrendyolPackages } from "./providers/trendyol-provider";
import { enrichMarketplaceLines } from "./line-enrichment";

const DEFAULT_PACKAGING = 15;
const DEFAULT_SERVICE = 15;

function normalizePlatform(p: string) {
  return p.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function syncConnection(connectionId: string) {
  const conn = await prisma.marketplaceConnection.findUnique({
    where: { id: connectionId },
    include: { dealer: true },
  });
  if (!conn) throw new Error("Bağlantı bulunamadı");

  const log = await prisma.marketplaceSyncLog.create({
    data: {
      connectionId: conn.id,
      marketplace: normalizePlatform(conn.platform),
      status: "RUNNING",
      detailsJson: JSON.stringify({ engine: getMarketplaceEngine() }),
    },
  });

  await prisma.marketplaceConnection.update({
    where: { id: conn.id },
    data: { connectionStatus: "SYNCING", lastError: "" },
  });

  let newOrders = 0;
  let updatedOrders = 0;
  let importedOrders = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    const platform = conn.platform.toLowerCase();
    if (!["trendyol"].includes(platform)) {
      throw new Error(`${conn.platform} senkronizasyonu henüz aktif değil`);
    }

    const { packages, usedMock, apiError } = await fetchTrendyolPackages(
      {
        sellerId: conn.sellerId,
        apiKey: conn.apiKey,
        apiSecret: conn.apiSecret,
      },
      conn.lastSyncAt,
      conn.id
    );

    if (usedMock && apiError) {
      errors.push(`Mock fallback (dev/test): ${apiError}`);
    }

    for (const pkg of packages) {
      try {
        const platformOrderId = String(pkg.orderNumber);
        const existingMp = await prisma.marketplaceOrder.findFirst({
          where: { connectionId: conn.id, platformOrderId },
        });

        const addr = pkg.shipmentAddress || {};
        const rawLines = (pkg.lines || []).map((line: {
          productName?: string;
          barcode?: string;
          quantity?: number;
          price?: number;
          amount?: number;
          productImageUrl?: string;
          imageUrl?: string;
        }) => ({
          productName: line.productName || "Ürün",
          barcode: line.barcode || "",
          sku: line.barcode || "",
          quantity: line.quantity || 1,
          unitPrice: line.price || line.amount || 0,
          imageUrl: line.productImageUrl || line.imageUrl || "",
        }));

        const tyConn = {
          sellerId: conn.sellerId,
          apiKey: conn.apiKey,
          apiSecret: conn.apiSecret,
        };
        const enrichedLines = await enrichMarketplaceLines(rawLines, conn.dealerId, tyConn);

        let mpOrder = existingMp;
        if (!mpOrder) {
          mpOrder = await prisma.marketplaceOrder.create({
            data: {
              connectionId: conn.id,
              platform: normalizePlatform(conn.platform),
              platformOrderId,
              customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
              customerPhone: addr.phoneNumber || "",
              customerAddress: addr.addressDetail || addr.address1 || "",
              customerCity: `${addr.city || ""} / ${addr.district || ""}`,
              totalAmount: enrichedLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
              status: "new",
              items: {
                create: enrichedLines.map((l) => ({
                  productName: l.productName,
                  barcode: l.barcode,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  total: l.unitPrice * l.quantity,
                  productSku: l.sku,
                  productImage: l.imageUrl || "",
                })),
              },
            },
          });
          newOrders++;
        } else {
          updatedOrders++;
          for (const line of enrichedLines) {
            if (!line.barcode && !line.productName) continue;
            const mpItem = await prisma.marketplaceOrderItem.findFirst({
              where: {
                orderId: mpOrder.id,
                OR: [
                  ...(line.barcode ? [{ barcode: line.barcode }] : []),
                  { productName: line.productName },
                ],
              },
            });
            if (mpItem && line.imageUrl && !mpItem.productImage) {
              await prisma.marketplaceOrderItem.update({
                where: { id: mpItem.id },
                data: { productImage: line.imageUrl },
              });
            }
          }
        }

        const importLines = enrichedLines.map((l) => ({
          productName: l.productName,
          barcode: l.barcode,
          sku: l.sku || l.barcode,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          imageUrl: l.imageUrl || "",
        }));

        const result = await importMarketplaceOrderToFulfillment({
          dealerId: conn.dealerId,
          connectionId: conn.id,
          marketplaceOrderRecordId: mpOrder.id,
          payload: {
            platform: normalizePlatform(conn.platform),
            platformOrderId,
            customerName: mpOrder.customerName,
            customerPhone: mpOrder.customerPhone,
            customerCity: mpOrder.customerCity,
            customerAddress: mpOrder.customerAddress,
            cargoTrackingNumber: pkg.cargoTrackingNumber ? String(pkg.cargoTrackingNumber) : "",
            cargoProviderName: pkg.cargoProviderName || "",
            items: importLines,
          },
        });

        if (!result.duplicate) importedOrders++;
        if (result.duplicate) updatedOrders++;
      } catch (e) {
        errorCount++;
        errors.push(e instanceof Error ? e.message : "Import hatası");
      }
    }

    await prisma.marketplaceConnection.update({
      where: { id: conn.id },
      data: {
        connectionStatus: "CONNECTED",
        active: true,
        lastSyncAt: new Date(),
        lastError: errors[0] || "",
      },
    });
  } catch (e) {
    errorCount++;
    const msg = e instanceof Error ? e.message : "Sync hatası";
    errors.push(msg);
    await prisma.marketplaceConnection.update({
      where: { id: conn.id },
      data: { connectionStatus: "ERROR", lastError: msg },
    });
  }

  await prisma.marketplaceSyncLog.update({
    where: { id: log.id },
    data: {
      status: errorCount > 0 && newOrders === 0 && importedOrders === 0 ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
      newOrders,
      updatedOrders,
      errorCount,
      errorMessage: errors.join("; ").slice(0, 500),
      detailsJson: JSON.stringify({ errors, engine: getMarketplaceEngine(), importedOrders }),
    },
  });

  return { newOrders, updatedOrders, importedOrders, errorCount, errors };
}

export type SyncAllResult = {
  connectionId: string;
  newOrders: number;
  updatedOrders: number;
  importedOrders: number;
  errorCount: number;
  errors: string[];
};

export async function syncAllConnections() {
  const connections = await prisma.marketplaceConnection.findMany({ where: { active: true } });
  const results: SyncAllResult[] = [];
  for (const c of connections) {
    results.push({ connectionId: c.id, ...(await syncConnection(c.id)) });
  }
  return results;
}

export function summarizeSyncResults(results: SyncAllResult[]) {
  return {
    syncedConnections: results.length,
    importedOrders: results.reduce((s, r) => s + r.importedOrders, 0),
    newOrders: results.reduce((s, r) => s + r.newOrders, 0),
    updatedOrders: results.reduce((s, r) => s + r.updatedOrders, 0),
    errorCount: results.reduce((s, r) => s + r.errorCount, 0),
  };
}

export { DEFAULT_PACKAGING, DEFAULT_SERVICE };
