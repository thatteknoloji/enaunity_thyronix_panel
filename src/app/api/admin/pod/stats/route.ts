import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();

    const licenses = await prisma.moduleLicense.findMany({
      where: { moduleKey: "POD_CREATOR" },
    });

    const now = new Date();
    const active = licenses.filter(
      (l) =>
        (l.status === "ACTIVE" || l.status === "TRIAL") &&
        l.lifecycleStage === "active" &&
        (!l.endsAt || l.endsAt >= now)
    );
    const trial = licenses.filter((l) => l.status === "TRIAL");
    const expired = licenses.filter(
      (l) => l.status === "EXPIRED" || l.lifecycleStage === "expired" || (l.endsAt && l.endsAt < now)
    );

    const byPlan = (planKey: string) => active.filter((l) => l.planKey === planKey).length;

    const [activeLicensedDealers, trialCount, expiredCount, starterCount, proCount, eliteCount, totalDesigns, totalProjects, totalMockups, storeReady] =
      await Promise.all([
        Promise.resolve(new Set(active.map((l) => l.dealerId)).size),
        Promise.resolve(trial.length),
        Promise.resolve(expired.length),
        Promise.resolve(byPlan("starter")),
        Promise.resolve(byPlan("pro")),
        Promise.resolve(byPlan("elite")),
        prisma.pODDesign.count(),
        prisma.pODProject.count(),
        prisma.pODProject.count({ where: { mockupUrl: { not: "" } } }),
        prisma.pODProject.count({ where: { status: "STORE_READY" } }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        activeLicensedDealers,
        trialCount,
        expiredCount,
        starterCount,
        proCount,
        eliteCount,
        totalDesigns,
        totalProjects,
        totalMockups,
        storeReady,
        editorPhaseActive: true,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yetkisiz";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}
