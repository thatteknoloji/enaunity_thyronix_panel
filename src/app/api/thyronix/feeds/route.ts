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

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const feeds = await prisma.thyronixFeed.findMany({
      where: withTenantFilter(user, {}),
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
    const count = await prisma.thyronixFeed.count({ where: withTenantFilter(user, {}) });
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
        outputFormat: body.outputFormat || "jetteknoloji",
        mergeStrategy: body.mergeStrategy || "lowest_price",
        schedule: body.schedule || 24,
        status: body.status || "active",
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
