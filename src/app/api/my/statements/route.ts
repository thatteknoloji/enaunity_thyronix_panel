import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { generateMonthlyStatement } from "@/lib/fulfillment/accounts";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    if (searchParams.get("generate") === "true") {
      const result = await generateMonthlyStatement(dealerId, year, month);
      return NextResponse.json({ success: true, data: result });
    }

    const statements = await prisma.dealerStatement.findMany({
      where: { dealerId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 24,
    });
    return NextResponse.json({ success: true, data: statements });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
