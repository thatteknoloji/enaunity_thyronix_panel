import type { TrendyolConnectionCredentials } from "./providers/trendyol-provider";

const INTEGRATION_BASE = "https://apigw.trendyol.com/integration/sellers";

function basicAuth(apiKey: string, apiSecret: string): string {
  return Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
}

export type TrendyolLabelResult = {
  format: string;
  label: string;
};

export async function fetchTrendyolCommonLabel(
  credentials: TrendyolConnectionCredentials,
  cargoTrackingNumber: string
): Promise<TrendyolLabelResult[]> {
  const url = `${INTEGRATION_BASE}/${credentials.sellerId}/common-label/query?id=${encodeURIComponent(cargoTrackingNumber)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${basicAuth(credentials.apiKey, credentials.apiSecret)}`,
      "User-Agent": `${credentials.sellerId} - SelfIntegration`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trendyol etiket API ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data?: TrendyolLabelResult[] };
  return json.data || [];
}
