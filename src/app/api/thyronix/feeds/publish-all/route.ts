import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";
import { resolveDealerId } from "@/lib/thyronix/workspace";
import { ensureSourceFeedsForSources } from "@/lib/thyronix/source-feed-provision";
import { warmFeedXmlCache } from "@/lib/thyronix/feed-cache-warm";

export async function POST() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const dealerId = await resolveDealerId(user);
    if (!dealerId) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 403 });
    }

    const sources = await prisma.thyronixSource.findMany({
      where: withTenantFilter(user, { status: "active" }),
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
      orderBy: { name: "asc" },
    });

    await ensureSourceFeedsForSources(sources);

    let combined = await prisma.thyronixFeed.findFirst({
      where: withTenantFilter(user, { sourceId: null, status: "active" }),
      orderBy: [{ productCount: "desc" }, { createdAt: "asc" }],
    });
    if (!combined) {
      combined = await prisma.thyronixFeed.create({
        data: {
          name: "Birleşik XML — Tüm Kaynaklar",
          channel: "marketplace",
          status: "active",
          outputFormat: "jetteknoloji",
          mergeStrategy: "lowest_price",
          schedule: 24,
          interval: 1440,
          dealerId,
          tenantScope: "DEALER",
          ownerType: "DEALER",
        },
      });
    }

    const feedIds = new Set<string>([combined.id]);
    const perSourceFeeds = await prisma.thyronixFeed.findMany({
      where: withTenantFilter(user, { sourceId: { not: null }, status: "active" }),
      select: { id: true, name: true },
    });
    perSourceFeeds.forEach((f) => feedIds.add(f.id));

    const results: Array<{ id: string; name: string; productCount: number; error?: string }> = [];
    for (const feedId of feedIds) {
      const feed = await prisma.thyronixFeed.findUnique({ where: { id: feedId } });
      if (!feed) continue;
      try {
        const warmed = await warmFeedXmlCache(feed.id);
        results.push({ id: feed.id, name: feed.name, productCount: warmed.productCount });
      } catch (e) {
        results.push({
          id: feed.id,
          name: feed.name,
          productCount: 0,
          error: e instanceof Error ? e.message : "Yayın hatası",
        });
      }
    }

    const ok = results.filter((r) => r.productCount > 0).length;
    return NextResponse.json({
      success: true,
      data: {
        published: ok,
        total: results.length,
        combined: results.filter((r) => r.id === combined?.id),
        perSource: results.filter((r) => r.id !== combined?.id),
        results,
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
