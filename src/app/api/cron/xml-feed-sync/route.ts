import { NextResponse } from "next/server";
import { syncDueXmlFeeds } from "@/lib/products/xml-feed/scheduler";

export const dynamic = "force-dynamic";

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const limit = clampInt(url.searchParams.get("limit"), 2, 1, 5);
    const result = await syncDueXmlFeeds({ limit });

    return NextResponse.json({
      success: true,
      data: {
        schedule: "12 saat (feed bazlı)",
        limit,
        ...result,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "XML feed cron hatası" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
