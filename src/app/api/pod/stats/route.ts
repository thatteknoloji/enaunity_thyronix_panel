import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [
      totalDesigns,
      totalProjects,
      storeReady,
      mockupReady,
      totalMockups,
    ] = await Promise.all([
      prisma.pODDesign.count(),
      prisma.pODProject.count(),
      prisma.pODProject.count({ where: { status: "STORE_READY" } }),
      prisma.pODProject.count({ where: { status: "MOCKUP_READY" } }),
      prisma.pODProject.count({ where: { mockupUrl: { not: "" } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalDesigns,
        totalProjects,
        totalMockups,
        storeReady,
        mockupReady,
        editorPhaseActive: true,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stats alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
