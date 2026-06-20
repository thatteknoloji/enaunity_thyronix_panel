import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { LINKSLASH_MODULE_KEY } from "@/lib/linkslash/access";

export async function GET() {
  try {
    await requireAdmin();

    const [pendingCount, syncedCount, totalCount, planCount, licenseCount, activeLicenseCount, recentCaptures] =
      await Promise.all([
        prisma.linkSlashCapture.count({ where: { status: "pending" } }),
        prisma.linkSlashCapture.count({ where: { status: "synced" } }),
        prisma.linkSlashCapture.count(),
        prisma.modulePlan.count({ where: { moduleKey: LINKSLASH_MODULE_KEY, isActive: true } }),
        prisma.moduleLicense.count({ where: { moduleKey: LINKSLASH_MODULE_KEY } }),
        prisma.moduleLicense.count({
          where: { moduleKey: LINKSLASH_MODULE_KEY, status: { in: ["ACTIVE", "TRIAL"] } },
        }),
        prisma.linkSlashCapture.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            url: true,
            title: true,
            domain: true,
            sourceType: true,
            status: true,
            userId: true,
            dealerId: true,
            createdAt: true,
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        health: {
          api: "ok",
          moduleKey: LINKSLASH_MODULE_KEY,
          routes: {
            session: "/api/linkslash/session",
            capture: "/api/linkslash/capture",
            proxy: "/api/linkslash/proxy/fetch",
            app: "/dealer/linkslash",
            extension: "/linkslash/extension/manifest.json",
          },
        },
        stats: {
          capturesPending: pendingCount,
          capturesSynced: syncedCount,
          capturesTotal: totalCount,
          plans: planCount,
          licenses: licenseCount,
          licensesActive: activeLicenseCount,
        },
        recentCaptures,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Overview alınamadı";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
