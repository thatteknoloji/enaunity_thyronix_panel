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

    return NextResponse.json({
      success: true,
      data: {
        activeLicensedDealers: new Set(active.map((l) => l.dealerId)).size,
        trialCount: trial.length,
        expiredCount: expired.length,
        starterCount: byPlan("starter"),
        proCount: byPlan("pro"),
        eliteCount: byPlan("elite"),
        editorPhaseActive: false,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yetkisiz";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}
