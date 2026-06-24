import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessFeed,
  requireThyronixDealerOrAdmin,
  tenantOwnerFields,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";
import { checkPlanLimit } from "@/lib/thyronix/workspace";
import { resolveDealerId } from "@/lib/thyronix/workspace";
import { normalizeTemplateId } from "@/lib/thyronix/templates";
import { FEED_REFRESH_INTERVALS } from "@/lib/thyronix/commercial";
import { ensureSourceFeedsForSources } from "@/lib/thyronix/source-feed-provision";

function normalizeSchedule(value: unknown): 4 | 6 | 12 | 24 {
  const n = Number(value);
  return (FEED_REFRESH_INTERVALS.includes(n as 4 | 6 | 12 | 24) ? n : 24) as 4 | 6 | 12 | 24;
}

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const sources = await prisma.thyronixSource.findMany({
      where: withTenantFilter(user, {}),
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
    await ensureSourceFeedsForSources(
      sources.map((source) => ({
        ...source,
        lastSync: source.lastSync || null,
      }))
    );
    const feeds = await prisma.thyronixFeed.findMany({
      where: withTenantFilter(user, {}),
      include: { source: { select: { name: true, type: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: feeds });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const owner = tenantOwnerFields(user);
    const dealerId = await resolveDealerId(user);
    const count = await prisma.thyronixFeed.count({ where: withTenantFilter(user, { sourceId: null }) });
    const limitCheck = await checkPlanLimit(dealerId, "feeds", count);
    if (!limitCheck.ok) {
      return NextResponse.json(
        { success: false, error: `Paket limiti: en fazla ${limitCheck.limit} feed (${limitCheck.planKey})` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const feed = await prisma.thyronixFeed.create({
      data: {
        name: body.name,
        channel: body.channel || "custom",
        url: body.url || null,
        interval: body.interval || 60,
        outputFormat: normalizeTemplateId(body.outputFormat || "jetteknoloji"),
        mergeStrategy: body.mergeStrategy || "lowest_price",
        schedule: normalizeSchedule(body.schedule),
        status: body.status || "active",
        sourceId: body.sourceId || null,
        dealerId: owner.dealerId,
        tenantScope: owner.tenantScope,
        ownerType: owner.ownerType,
      },
    });
    return NextResponse.json({ success: true, data: feed }, { status: 201 });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
