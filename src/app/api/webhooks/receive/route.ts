import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const eventType = req.nextUrl.searchParams.get("event") || "unknown";
    const payload = await req.json();

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { active: true },
    });

    const matchingEndpoints = endpoints.filter((ep) => {
      const events: string[] = JSON.parse(ep.events || "[]");
      return events.length === 0 || events.includes(eventType) || events.includes("*");
    });

    const results: { url: string; status: number }[] = [];

    for (const ep of matchingEndpoints) {
      const start = Date.now();
      try {
        const res = await fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Event-Type": eventType,
            ...(ep.secret ? { "X-Webhook-Secret": ep.secret } : {}),
          },
          body: JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() }),
        });

        const duration = Date.now() - start;
        const resText = await res.text();

        await prisma.webhookLog.create({
          data: {
            endpointId: ep.id,
            event: eventType,
            status: res.status,
            request: JSON.stringify(payload).slice(0, 2000),
            response: resText.slice(0, 2000),
            duration,
          },
        });

        await prisma.webhookEndpoint.update({
          where: { id: ep.id },
          data: {
            lastCall: new Date(),
            lastStatus: res.status,
            failCount: res.ok ? 0 : { increment: 1 },
          },
        });

        results.push({ url: ep.url, status: res.status });
      } catch (err: any) {
        const duration = Date.now() - start;
        await prisma.webhookLog.create({
          data: {
            endpointId: ep.id,
            event: eventType,
            status: 0,
            request: JSON.stringify(payload).slice(0, 2000),
            response: err.message?.slice(0, 2000) || "Connection failed",
            duration,
          },
        });
        await prisma.webhookEndpoint.update({
          where: { id: ep.id },
          data: { failCount: { increment: 1 } },
        });
        results.push({ url: ep.url, status: 0 });
      }
    }

    return NextResponse.json({ success: true, forwarded: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
