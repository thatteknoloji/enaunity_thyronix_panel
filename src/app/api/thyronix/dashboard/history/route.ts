import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";

export async function GET() {
  try {
    await requireThyronixAdmin();

    // Get last 20 sync logs for sparkline data
    const logs = await prisma.thyronixSyncLog.findMany({
      where: { type: "sync" },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { productCount: true, status: true, createdAt: true },
    });

    // Generate sparkline data: product counts over time
    const sparklineData = logs.map(l => l.productCount || 0);

    // If no sync history, return current product count as baseline
    if (sparklineData.length === 0) {
      const count = await prisma.thyronixProduct.count();
      return NextResponse.json({
        success: true,
        data: {
          sparkline: [count],
          errorSparkline: [0],
          labels: [],
        },
      });
    }

    // Error sparkline: count of error-status syncs per log entry
    const errorSparkline = logs.map((l, i) => {
      if (i === 0) return 0;
      return l.status === "error" ? (sparklineData[i - 1] || 0) - (l.productCount || 0) : 0;
    });

    // Labels: relative time
    const labels = logs.map(l => {
      const diff = Date.now() - new Date(l.createdAt).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "şimdi";
      if (mins < 60) return `${mins}dk`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}s`;
      return `${Math.floor(hrs / 24)}g`;
    });

    return NextResponse.json({
      success: true,
      data: { sparkline: sparklineData, errorSparkline, labels },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
