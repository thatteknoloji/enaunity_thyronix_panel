import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureSourceFeedsForSources } from "@/lib/thyronix/source-feed-provision";

export async function GET() {
  try {
    await requireAdmin();
    const sources = await prisma.thyronixSource.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        inputFormat: true,
        status: true,
        productCount: true,
        lastSync: true,
        dealerId: true,
        tenantScope: true,
        ownerType: true,
      },
      orderBy: { createdAt: "asc" },
    });
    await ensureSourceFeedsForSources(sources.map((source) => ({ ...source, lastSync: source.lastSync || null })));
    const feeds = await prisma.thyronixFeed.findMany({
      include: { source: { select: { name: true, type: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: feeds });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const feed = await prisma.thyronixFeed.create({
      data: {
        name: body.name,
        channel: body.channel,
        url: body.url || null,
        interval: body.interval || 60,
        sourceId: body.sourceId || null,
      },
    });
    return NextResponse.json({ success: true, data: feed }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
