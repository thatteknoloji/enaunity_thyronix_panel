import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get("status") || "PENDING_APPROVAL";
    const items = await prisma.dealerBalanceTopUp.findMany({
      where: { status },
      include: { dealer: { select: { id: true, name: true, company: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, data: { items } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Liste alınamadı";
    const code = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status: code });
  }
}
