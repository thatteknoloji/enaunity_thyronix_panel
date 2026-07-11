import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        productLibraryAccess: false,
        code: "AUTH_REQUIRED",
        loginUrl: "/auth/login?redirect=/dealer/product-library",
        dealerDashboardUrl: "/dealer/product-library",
        connectorVersion: "0.1.0",
      });
    }

    if (!user.dealerId) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        productLibraryAccess: false,
        code: "DEALER_REQUIRED",
        dealerDashboardUrl: "/dealer/product-library",
        connectorVersion: "0.1.0",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          dealerId: null,
        },
      });
    }

    const dealerId = user.dealerId;
    const [connections, pendingJobs, processingJobs] = await Promise.all([
      prisma.marketplaceConnection.findMany({
        where: { dealerId, active: true },
        orderBy: [{ platform: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          platform: true,
          sellerId: true,
          storeId: true,
          connectionStatus: true,
          lastSyncAt: true,
          lastError: true,
          active: true,
        },
      }),
      prisma.productMarketplaceJob.count({
        where: { dealerId, status: "PENDING" },
      }),
      prisma.productMarketplaceJob.count({
        where: { dealerId, status: "PROCESSING" },
      }),
    ]);

    const connectionIds = connections.map((connection) => connection.id);
    const groupedJobs = connectionIds.length
      ? await prisma.productMarketplaceJob.groupBy({
          by: ["connectionId", "status"],
          where: {
            dealerId,
            connectionId: { in: connectionIds },
            status: { in: ["PENDING", "PROCESSING", "FAILED", "COMPLETED"] },
          },
          _count: { _all: true },
        })
      : [];

    const countsByConnection = new Map<string, Record<string, number>>();
    for (const row of groupedJobs) {
      const bucket = countsByConnection.get(row.connectionId) || {};
      bucket[row.status] = row._count._all;
      countsByConnection.set(row.connectionId, bucket);
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      productLibraryAccess: true,
      connectorVersion: "0.1.0",
      dealerDashboardUrl: "/dealer/product-library",
      jobsUrl: "/api/product-library/marketplace-jobs",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        dealerId,
      },
      summary: {
        pendingJobs,
        processingJobs,
        connectionCount: connections.length,
      },
      connections: connections.map((connection) => {
        const counts = countsByConnection.get(connection.id) || {};
        return {
          ...connection,
          label: `${connection.platform} / ${connection.storeId || connection.sellerId || "Magaza"}`,
          jobCounts: {
            pending: counts.PENDING || 0,
            processing: counts.PROCESSING || 0,
            failed: counts.FAILED || 0,
            completed: counts.COMPLETED || 0,
          },
        };
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connector oturumu okunamadi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
