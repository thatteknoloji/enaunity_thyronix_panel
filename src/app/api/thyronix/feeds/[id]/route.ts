import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessFeed,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
} from "@/lib/thyronix/access";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id } = await params;
    await assertCanAccessFeed(user, id);
    const body = await req.json();
    const feed = await prisma.thyronixFeed.update({
      where: { id },
      data: {
        name: body.name,
        channel: body.channel,
        url: body.url,
        interval: body.interval,
        outputFormat: body.outputFormat,
        mergeStrategy: body.mergeStrategy,
        schedule: body.schedule,
        status: body.status,
      },
    });
    return NextResponse.json({ success: true, data: feed });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id } = await params;
    await assertCanAccessFeed(user, id);
    await prisma.thyronixFeed.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
