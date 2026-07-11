import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { TrendyolConnectionCredentials } from "./providers/trendyol-provider";
import {
  updateTrendyolPackageStatus,
  type TrendyolLabelContext,
} from "./trendyol-integration-orders";
import {
  formatTrendyolLabelError,
  isTrendyolLabelPermissionError,
} from "./trendyol-label-policy";
import { readJsonResponse } from "@/lib/marketplaces/http";

const INTEGRATION_BASE = "https://apigw.trendyol.com/integration/sellers";

function basicAuth(apiKey: string, apiSecret: string): string {
  return Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
}

export type TrendyolLabelResult = {
  format: string;
  label: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatTrendyolLabelError(`Trendyol etiket API ${res.status}: ${text.slice(0, 300)}`));
  }

  if (method === "POST") return null;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      formatTrendyolLabelError(
        `Trendyol etiket API JSON bekleniyordu ama "${contentType || "bilinmiyor"}" döndü: ${text.slice(0, 300)}`
      )
    );
  }
  const json = await readJsonResponse<{ data?: TrendyolLabelResult[] }>(new Response(text, { status: res.status, headers: res.headers }), "Trendyol etiket API");
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

async function ensurePackageReadyForLabel(
  credentials: TrendyolConnectionCredentials,
  ctx: TrendyolLabelContext
) {
  if (!ctx.shipmentPackageId) return;

  const lines = (ctx.lines || [])
    .filter((l) => l.lineId)
    .map((l) => ({ lineId: l.lineId as number, quantity: l.quantity || 1 }));
  if (!lines.length) return;

  const status = (ctx.packageStatus || "").toUpperCase();
  const ready = ["PICKING", "INVOICED", "SHIPPED", "DELIVERED"].includes(status);
  if (!ready) {
    await updateTrendyolPackageStatus(credentials, ctx.shipmentPackageId, "Picking", lines);
    await sleep(2000);
  }
}

export async function fetchTrendyolLabelWithCreate(
  credentials: TrendyolConnectionCredentials,
  cargoTrackingNumber: string,
  ctx: TrendyolLabelContext = {}
): Promise<TrendyolLabelResult[]> {
  await ensurePackageReadyForLabel(credentials, ctx);

  let createError = "";
  for (let i = 0; i < 3; i++) {
    try {
      await createTrendyolCommonLabel(credentials, cargoTrackingNumber);
      createError = "";
      break;
    } catch (err) {
      createError = err instanceof Error ? err.message : "createCommonLabel hatası";
      if (isTrendyolLabelPermissionError(createError)) throw err;
      if (i < 2) await sleep(1500);
    }
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt > 0) {
      await sleep(2000);
      try {
        await createTrendyolCommonLabel(credentials, cargoTrackingNumber);
      } catch {
        /* tekrar dene */
      }
    }

    try {
      const labels = await fetchTrendyolCommonLabel(credentials, cargoTrackingNumber);
      if (labels.length > 0 && labels.some((l) => l.label)) return labels;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (isTrendyolLabelPermissionError(msg)) throw err;
      const retriable =
        msg.includes("COMMON_LABEL_NOT_FOUND") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("404");
      if (!retriable && attempt === 7) throw err;
      if (attempt === 7) {
        throw new Error(
          createError ||
            msg ||
            "Trendyol ortak etiket oluşturulamadı. Sipariş Picking/Invoiced olmalı."
        );
      }
    }
  }

  throw new Error(
    createError ||
      "Trendyol etiketi hazır değil. TY panelinde paket durumunu Picking yapıp tekrar deneyin."
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
