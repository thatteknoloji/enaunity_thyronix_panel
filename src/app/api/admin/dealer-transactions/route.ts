import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { mapAccountTxToLegacyShape } from "@/lib/accounting/accounting-service";
import { getAccountingEngine } from "@/lib/accounting/config";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "50");
    const dealerId = searchParams.get("dealerId") || "";
    const type = searchParams.get("type") || "";

    const where: { dealerId?: string; type?: string } = {};
    if (dealerId) where.dealerId = dealerId;
    if (type) where.type = type;

    const [rawItems, total] = await Promise.all([
      prisma.dealerAccountTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
        include: { dealer: { select: { name: true, company: true } } },
      }),
      prisma.dealerAccountTransaction.count({ where }),
    ]);

    const items = rawItems.map((t) => ({
      ...mapAccountTxToLegacyShape(t),
      dealerId: t.dealerId,
      dealer: t.dealer,
    }));

    return NextResponse.json({
      success: true,
      data: { items, total, page, size, engine: getAccountingEngine() },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
