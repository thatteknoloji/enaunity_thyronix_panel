import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse, withTenantFilter } from "@/lib/thyronix/access";
import { getWorkspaceSettings } from "@/lib/thyronix/workspace";
import { getThyronixDuplicateInsights } from "@/lib/thyronix/duplicate-insights";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const productWhere = withTenantFilter(user, {});
    const sourceWhere = withTenantFilter(user, {});
    const feedWhere = withTenantFilter(user, {});

    const [
      totalProducts,
      totalSources,
      activeSources,
      activeFeeds,
      totalFeeds,
      failedProducts,
      errorProducts,
      syncLogs,
      lastSync,
      feeds,
      sources,
      rules,
      aiJobs,
      healthMissingBarcode,
      syncSuccess,
      syncTotal,
    ] = await Promise.all([
      prisma.thyronixProduct.count({ where: productWhere }),
      prisma.thyronixSource.count({ where: sourceWhere }),
      prisma.thyronixSource.count({ where: withTenantFilter(user, { status: "active" }) }),
      prisma.thyronixFeed.count({ where: withTenantFilter(user, { status: "active" }) }),
      prisma.thyronixFeed.count({ where: feedWhere }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { status: "pending" }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { status: "excluded" }) }),
      prisma.thyronixSyncLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.thyronixSyncLog.findFirst({ where: { type: "sync" }, orderBy: { createdAt: "desc" } }),
      prisma.thyronixFeed.findMany({
        where: feedWhere,
        select: { id: true, name: true, channel: true, productCount: true, status: true, lastPublished: true, outputFormat: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.thyronixSource.findMany({
        where: sourceWhere,
        select: { id: true, name: true, productCount: true, status: true, lastSync: true, type: true },
      }),
      prisma.thyronixRule.findMany({
        where: withTenantFilter(user, { status: "active" }),
        select: { name: true, affectedCount: true },
      }),
      prisma.thyronixAiJob.count(),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { barcode: null }) }),
      prisma.thyronixSyncLog.count({ where: { status: "success" } }),
      prisma.thyronixSyncLog.count(),
    ]);

    const workspace = await getWorkspaceSettings(user);
    const duplicateInsights = await getThyronixDuplicateInsights(productWhere);
    const feedHealthScore = totalFeeds === 0 ? 0 : Math.round((activeFeeds / totalFeeds) * 100);
    const syncSuccessRate = syncTotal > 0 ? Math.round((syncSuccess / syncTotal) * 100) : 100;

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalSources,
        activeSources,
        activeFeeds,
        totalFeeds,
        failedProducts,
        errorProducts,
        recentSyncs: syncLogs,
        lastSync,
        sourceDistribution: sources,
        feeds,
        rules,
        aiUsage: { totalJobs: aiJobs, enabled: workspace.limits.aiEnabled },
        health: {
          feedHealthScore,
          missingBarcode: healthMissingBarcode,
          syncSuccessRate,
          errorCount: errorProducts + failedProducts,
        },
        duplicates: duplicateInsights,
        plan: { key: workspace.planKey, limits: workspace.limits },
        onboarding: {
          completed: workspace.onboardingCompleted,
          step: workspace.onboardingStep,
        },
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
