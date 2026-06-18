import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDealerAccount } from "@/lib/fulfillment/accounts";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const dealerId = searchParams.get("dealerId");
    if (dealerId) {
      const account = await ensureDealerAccount(dealerId);
      const txs = await prisma.dealerAccountTransaction.findMany({
        where: { dealerId },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ success: true, data: { account, transactions: txs } });
    }
    const accounts = await prisma.dealerAccount.findMany({
      include: { dealer: { select: { id: true, name: true, company: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ success: true, data: accounts });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
