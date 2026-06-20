import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { TrendyolConnectionCredentials } from "./providers/trendyol-provider";

const INTEGRATION_BASE = "https://apigw.trendyol.com/integration/sellers";

function basicAuth(apiKey: string, apiSecret: string): string {
  return Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
}

export type TrendyolLabelResult = {
  format: string;
  label: string;
};

async function tyRequest(
  credentials: TrendyolConnectionCredentials,
  cargoTrackingNumber: string,
  method: "GET" | "POST",
  body?: object
) {
  const url = `${INTEGRATION_BASE}/${credentials.sellerId}/common-label/${encodeURIComponent(cargoTrackingNumber)}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${basicAuth(credentials.apiKey, credentials.apiSecret)}`,
      "User-Agent": `${credentials.sellerId} - SelfIntegration`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trendyol etiket API ${res.status}: ${text.slice(0, 300)}`);
  }

  if (method === "POST") return null;
  const json = (await res.json()) as { data?: TrendyolLabelResult[] };
  return json.data || [];
}

export async function createTrendyolCommonLabel(
  credentials: TrendyolConnectionCredentials,
  cargoTrackingNumber: string
) {
  await tyRequest(credentials, cargoTrackingNumber, "POST", {
    format: "ZPL",
    boxQuantity: 1,
  });
}

export async function fetchTrendyolCommonLabel(
  credentials: TrendyolConnectionCredentials,
  cargoTrackingNumber: string
): Promise<TrendyolLabelResult[]> {
  const data = await tyRequest(credentials, cargoTrackingNumber, "GET");
  return data || [];
}

export async function fetchTrendyolLabelWithCreate(
  credentials: TrendyolConnectionCredentials,
  cargoTrackingNumber: string
): Promise<TrendyolLabelResult[]> {
  try {
    await createTrendyolCommonLabel(credentials, cargoTrackingNumber);
  } catch {
    /* Etiket zaten oluşturulmuş olabilir */
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
    const labels = await fetchTrendyolCommonLabel(credentials, cargoTrackingNumber);
    if (labels.length > 0 && labels.some((l) => l.label)) return labels;
  }

  throw new Error(
    "Trendyol etiketi henüz hazır değil. Sipariş Picking/Invoiced durumunda olmalı; birkaç saniye sonra tekrar deneyin veya TY panelinden kontrol edin."
  );
}

export async function saveTrendyolZplLabel(
  orderId: string,
  cargoTrackingNumber: string,
  zplContent: string
): Promise<{ fileUrl: string; fileName: string }> {
  const dir = path.join(process.cwd(), "public", "uploads", "shipping-labels");
  await mkdir(dir, { recursive: true });
  const safeName = `ty-${cargoTrackingNumber}-${orderId.slice(-6)}.zpl`;
  await writeFile(path.join(dir, safeName), zplContent, "utf8");
  return {
    fileUrl: `/uploads/shipping-labels/${safeName}`,
    fileName: safeName,
  };
}
