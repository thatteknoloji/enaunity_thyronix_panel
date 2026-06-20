import {
  getPlatformClient,
  type TrendyolPackage,
} from "@/lib/marketplaces/trendyol";
import { fetchTrendyolIntegrationPackages } from "../trendyol-integration-orders";
import { isDevOrTestMode } from "../config";

export type TrendyolConnectionCredentials = {
  sellerId: string;
  apiKey: string;
  apiSecret: string;
};

export type FetchPackagesResult = {
  packages: TrendyolPackage[];
  usedMock: boolean;
  apiError?: string;
};

export async function fetchTrendyolPackages(
  credentials: TrendyolConnectionCredentials,
  lastSyncAt?: Date | null,
  connectionId?: string
): Promise<FetchPackagesResult> {
  const connWithSecret = {
    sellerId: credentials.sellerId,
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
  };

  try {
    const packages = await fetchTrendyolIntegrationPackages(credentials, lastSyncAt);
    if (packages.length > 0) {
      return { packages, usedMock: false };
    }

    const client = await getPlatformClient({
      platform: "trendyol",
      sellerId: credentials.sellerId,
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
    });

    const legacyPackages = await client.getAllNewPackages(connWithSecret, lastSyncAt);
    return { packages: legacyPackages, usedMock: false };
  } catch (err) {
    const apiError = err instanceof Error ? err.message : "Trendyol API hatası";

    if (!isDevOrTestMode()) {
      console.error(`[Marketplace Hub] Trendyol API failed (production, no mock): ${apiError}`);
      throw new Error(`Trendyol API başarısız: ${apiError}`);
    }

    console.warn(`[Marketplace Hub] Trendyol API failed, using mock (dev/test): ${apiError}`);
    return {
      packages: buildMockPackages(connectionId || credentials.sellerId),
      usedMock: true,
      apiError,
    };
  }
}

function buildMockPackages(connectionId: string): TrendyolPackage[] {
  const seed = Date.now();
  return [
    {
      orderNumber: `MOCK-${connectionId.slice(-4)}-${seed}`,
      grossAmount: 299,
      totalDiscount: 0,
      totalPrice: 299,
      status: "Created",
      shipmentAddress: {
        firstName: "Test",
        lastName: "Müşteri",
        city: "İstanbul",
        district: "Kadıköy",
        address1: "Test Mah. No:1",
        phoneNumber: "5550000000",
      },
      lines: [{ productName: "Mock Ürün", barcode: "MOCK001", quantity: 1, price: 299, amount: 299 }],
    },
  ];
}
