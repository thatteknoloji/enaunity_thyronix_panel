import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const feeds = await prisma.thyronixFeed.findMany({
      where: { sourceId: null },
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
        ...(body.sourceId ? { source: { connect: { id: body.sourceId } } } : {}),
      },
    });
    return NextResponse.json({ success: true, data: feed }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
