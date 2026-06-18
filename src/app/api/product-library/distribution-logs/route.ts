import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireDealer } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope");

    if (scope === "admin") {
      await requireAdmin();
      const logs = await prisma.productDistributionLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { package: { select: { name: true, slug: true } } },
      });
      return NextResponse.json({ success: true, data: logs });
    }

    const user = await requireDealer();
    const logs = await prisma.productDistributionLog.findMany({
      where: { dealerId: user.dealerId! },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { package: { select: { name: true, slug: true } } },
    });
    return NextResponse.json({ success: true, data: logs });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
