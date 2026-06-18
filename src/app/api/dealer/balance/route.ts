import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import {
  getDealerBalance,
  getAccountSummary,
  mapAccountTxToLegacyShape,
} from "@/lib/accounting/accounting-service";
import { getAccountingEngine } from "@/lib/accounting/config";

export async function GET(req: NextRequest) {
  try {
    const user = await requireDealer();
    const dealer = await prisma.dealer.findUnique({
      where: { id: user.dealerId! },
      include: { paymentTerm: true },
    });
    if (!dealer) return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "100");

    const balanceInfo = await getDealerBalance(dealer.id);

    const where: { dealerId: string; createdAt?: { gte?: Date; lte?: Date } } = { dealerId: dealer.id };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z");
    }

    const [accountTxs, total] = await Promise.all([
      prisma.dealerAccountTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.dealerAccountTransaction.count({ where }),
    ]);

    const summary = await getAccountSummary(dealer.id);

    return NextResponse.json({
      success: true,
      data: {
        balance: balanceInfo.balance,
        openingBalance: dealer.openingBalance,
        creditLimit: balanceInfo.creditLimit,
        allowNegative: balanceInfo.allowNegative,
        availableLimit: balanceInfo.availableLimit,
        riskLevel: balanceInfo.riskLevel,
        paymentTerm: dealer.paymentTerm,
        transactions: accountTxs.map(mapAccountTxToLegacyShape),
        total,
        engine: getAccountingEngine(),
        account: summary.account,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
