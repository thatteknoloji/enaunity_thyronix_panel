import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Platform-wide aggregate stats for login/marketing (real DB counts) */
export async function GET() {
  try {
    const [products, sources, feeds, syncSuccess, syncTotal] = await Promise.all([
      prisma.thyronixProduct.count(),
      prisma.thyronixSource.count({ where: { status: "active" } }),
      prisma.thyronixFeed.count({ where: { status: "active" } }),
      prisma.thyronixSyncLog.count({ where: { status: "success" } }),
      prisma.thyronixSyncLog.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products,
        sources,
        feeds,
        syncSuccessRate: syncTotal > 0 ? Math.round((syncSuccess / syncTotal) * 100) : 100,
      },
    });
  } catch {
    return NextResponse.json({ success: false, data: { products: 0, sources: 0, feeds: 0, syncSuccessRate: 0 } });
  }
}
