import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse, withTenantFilter } from "@/lib/thyronix/access";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const productWhere = withTenantFilter(user, {});
    const sourceWhere = withTenantFilter(user, {});
    const feedWhere = withTenantFilter(user, {});
    const ruleWhere = withTenantFilter(user, {});

    const [
      totalProducts, activeProducts, passiveProducts, errorProducts,
      totalSources, activeSources, totalFeeds, activeFeeds,
      zeroPrice, zeroStock, missingBarcode, totalRules, activeRules,
      aiTotal, aiCompleted, aiFailed,
      syncSuccess, syncTotal,
    ] = await Promise.all([
      prisma.thyronixProduct.count({ where: productWhere }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { status: "active" }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { status: { not: "active" } }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { status: "excluded" }) }),
      prisma.thyronixSource.count({ where: sourceWhere }),
      prisma.thyronixSource.count({ where: withTenantFilter(user, { status: "active" }) }),
      prisma.thyronixFeed.count({ where: feedWhere }),
      prisma.thyronixFeed.count({ where: withTenantFilter(user, { status: "active" }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { price: 0 }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { stock: 0 }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { barcode: null }) }),
      prisma.thyronixRule.count({ where: ruleWhere }),
      prisma.thyronixRule.count({ where: withTenantFilter(user, { status: "active" }) }),
      prisma.thyronixAiJob.count(),
      prisma.thyronixAiJob.count({ where: { status: "completed" } }),
      prisma.thyronixAiJob.count({ where: { status: "failed" } }),
      prisma.thyronixSyncLog.count({ where: { status: "success" } }),
      prisma.thyronixSyncLog.count(),
    ]);

    const [sources, feedPerformance, lastSync, lastFeedLog, recentSyncs] = await Promise.all([
      prisma.thyronixSource.findMany({
        where: sourceWhere,
        select: { id: true, name: true, productCount: true, status: true, lastSync: true, type: true },
      }),
      prisma.thyronixFeed.findMany({
        where: feedWhere,
        select: { id: true, name: true, channel: true, productCount: true, status: true, lastPublished: true, outputFormat: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.thyronixSyncLog.findFirst({ where: { type: "sync" }, orderBy: { createdAt: "desc" } }),
      prisma.thyronixSyncLog.findFirst({ where: { type: "feed" }, orderBy: { createdAt: "desc" } }),
      prisma.thyronixSyncLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);

    const categoryBreakdown = await prisma.thyronixProduct.groupBy({
      by: ["category"],
      where: productWhere,
      _count: { id: true },
      _sum: { price: true, stock: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        products: { total: totalProducts, active: activeProducts, passive: passiveProducts, errors: errorProducts },
        issues: { zeroPrice, zeroStock, missingBarcode },
        sources: { total: totalSources, active: activeSources, list: sources },
        sourcePerformance: sources,
        feeds: { total: totalFeeds, active: activeFeeds },
        feedPerformance,
        rules: { total: totalRules, active: activeRules },
        aiUsage: { totalJobs: aiTotal, completed: aiCompleted, failed: aiFailed },
        syncStats: {
          success: syncSuccess,
          total: syncTotal,
          successRate: syncTotal > 0 ? Math.round((syncSuccess / syncTotal) * 100) : 100,
          recent: recentSyncs,
        },
        lastActivity: { sync: lastSync, feed: lastFeedLog, snapshot: null },
        categories: categoryBreakdown.map((c) => ({
          name: c.category || "Kategorisiz",
          count: c._count.id,
          totalPrice: c._sum.price || 0,
          totalStock: c._sum.stock || 0,
        })),
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
