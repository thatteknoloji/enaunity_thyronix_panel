import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  getDealerBalance,
  getAccountSummary,
  mapAccountTxToLegacyShape,
} from "@/lib/accounting/accounting-service";
import { getAccountingEngine, isDealerAccountEngine } from "@/lib/accounting/config";
import { getBalanceTopUpSettings } from "@/lib/payments/balance-topup-settings";
import { listPendingTopUpsForDealer } from "@/lib/payments/balance-topup-service";

function mapLegacyTx(tx: {
  id: string;
  type: string;
  amount: number;
  note: string;
  balanceAfter: number;
  orderId: string | null;
  createdAt: Date;
}) {
  const isCredit = ["payment_credit", "return_credit"].includes(tx.type);
  return {
    id: tx.id,
    type: tx.type === "payment_credit" ? "payment" : tx.type === "order_debit" ? "invoice" : tx.type,
    amount: tx.amount,
    note: tx.note,
    balanceAfter: tx.balanceAfter,
    orderId: tx.orderId,
    createdAt: tx.createdAt,
    debit: isCredit ? 0 : tx.amount,
    credit: isCredit ? tx.amount : 0,
    title: tx.note,
    source: "legacy_balance" as const,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.dealerId) {
      return NextResponse.json(
        { success: false, error: "Cari hesap yalnızca bayi kullanıcıları içindir." },
        { status: 403 },
      );
    }

    const dealer = await prisma.dealer.findUnique({
      where: { id: user.dealerId },
      include: { paymentTerm: true },
    });
    if (!dealer) {
      return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "100", 10);

    const balanceInfo = await getDealerBalance(dealer.id);

    const dateFilter: { gte?: Date; lte?: Date } | undefined =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          }
        : undefined;

    let transactions: (
      | ReturnType<typeof mapAccountTxToLegacyShape>
      | ReturnType<typeof mapLegacyTx>
    )[] = [];
    let total = 0;

    if (isDealerAccountEngine()) {
      const where = { dealerId: dealer.id, ...(dateFilter ? { createdAt: dateFilter } : {}) };
      const [accountTxs, count] = await Promise.all([
        prisma.dealerAccountTransaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.dealerAccountTransaction.count({ where }),
      ]);
      transactions = accountTxs.map(mapAccountTxToLegacyShape);
      total = count;
    }

    if (transactions.length === 0) {
      const legacyWhere = { dealerId: dealer.id, ...(dateFilter ? { createdAt: dateFilter } : {}) };
      const [legacyTxs, legacyCount] = await Promise.all([
        prisma.dealerTransaction.findMany({
          where: legacyWhere,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.dealerTransaction.count({ where: legacyWhere }),
      ]);
      if (legacyTxs.length > 0) {
        transactions = legacyTxs.map(mapLegacyTx);
        total = legacyCount;
      }
    }

    const summary = await getAccountSummary(dealer.id);
    const pendingTopUps = await listPendingTopUpsForDealer(dealer.id);
    const topUpSettings = await getBalanceTopUpSettings();

    return NextResponse.json({
      success: true,
      data: {
        balance: balanceInfo.balance,
        availableBalance: balanceInfo.balance,
        openingBalance: dealer.openingBalance,
        creditLimit: balanceInfo.creditLimit,
        allowNegative: balanceInfo.allowNegative,
        availableLimit: balanceInfo.availableLimit,
        riskLevel: balanceInfo.riskLevel,
        paymentTerm: dealer.paymentTerm,
        transactions,
        total,
        engine: getAccountingEngine(),
        account: summary.account,
        pendingTopUpTotal: pendingTopUps.reduce((s, t) => s + t.amount, 0),
        pendingTopUps: pendingTopUps.map((t) => ({
          id: t.id,
          amount: t.amount,
          method: t.method,
          status: t.status,
          createdAt: t.createdAt,
        })),
        topUpSettings,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bakiye bilgisi alınamadı";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
