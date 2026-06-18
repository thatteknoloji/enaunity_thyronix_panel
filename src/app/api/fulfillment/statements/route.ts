import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateMonthlyStatement } from "@/lib/fulfillment/accounts";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const dealerId = searchParams.get("dealerId");
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    if (dealerId) {
      const result = await generateMonthlyStatement(dealerId, year, month);
      return NextResponse.json({ success: true, data: result });
    }

    const statements = await prisma.dealerStatement.findMany({
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 100,
      include: { account: { include: { dealer: { select: { name: true, company: true } } } } },
    });
    return NextResponse.json({ success: true, data: statements });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
