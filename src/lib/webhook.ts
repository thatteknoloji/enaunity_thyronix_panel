import { prisma } from "@/lib/db";

type WebhookEvent =
  | "order.created"
  | "order.updated"
  | "order.status_changed"
  | "product.updated"
  | "product.stock_changed"
  | "dealer.created"
  | "dealer.updated"
  | "dealer.balance_changed";

export async function dispatchWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        active: true,
        events: { contains: event },
      },
    });

    for (const endpoint of endpoints) {
      const start = Date.now();
      try {
        const signature = endpoint.secret
          ? await createSignature(JSON.stringify(payload), endpoint.secret)
          : "";

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": event,
            "X-Webhook-Signature": signature,
            "User-Agent": "ENAUNITY-Webhook/1.0",
          },
          body: JSON.stringify({
            event,
            data: payload,
            timestamp: new Date().toISOString(),
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        const duration = Date.now() - start;
        const responseText = await res.text();

        await prisma.webhookLog.create({
          data: {
            endpointId: endpoint.id,
            event,
            status: res.status,
            request: JSON.stringify(payload).slice(0, 2000),
            response: responseText.slice(0, 2000),
            duration,
          },
        });

        await prisma.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: {
            lastCall: new Date(),
            lastStatus: res.status,
            failCount: res.ok ? 0 : { increment: 1 },
          },
        });
      } catch (err) {
        const duration = Date.now() - start;
        await prisma.webhookLog.create({
          data: {
            endpointId: endpoint.id,
            event,
            status: 0,
            request: JSON.stringify(payload).slice(0, 2000),
            response: String(err).slice(0, 2000),
            duration,
          },
        });

        await prisma.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: {
            lastCall: new Date(),
            lastStatus: 0,
            failCount: { increment: 1 },
          },
        });
      }
    }
  } catch {
    // Silently fail — don't break the main flow for webhook errors
  }
}

async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
