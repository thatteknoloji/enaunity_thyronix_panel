import { prisma } from "@/lib/db";
import {
  getAccountingEngine,
  isDealerAccountEngine,
  shouldMirrorLegacyTransaction,
  type AccountTransactionType,
} from "./config";

export type PostAccountTransactionParams = {
  dealerId: string;
  type: AccountTransactionType | string;
  title: string;
  debit?: number;
  credit?: number;
  orderId?: string;
  coreOrderId?: string;
  invoiceId?: string;
  notes?: string;
  legacyOrderId?: string;
};

export type DealerBalanceInfo = {
  balance: number;
  creditLimit: number;
  allowNegative: boolean;
  availableLimit: number;
  riskLevel: string;
  source: "dealer_account" | "legacy_balance";
};

function computeRiskLevel(balance: number, creditLimit: number): string {
  const debt = Math.max(0, -balance);
  if (creditLimit <= 0) return debt > 0 ? "MEDIUM" : "LOW";
  const ratio = debt / creditLimit;
  if (ratio >= 0.9) return "HIGH";
  if (ratio >= 0.6) return "MEDIUM";
  return "LOW";
}

function mapTypeToLegacy(type: string, isCredit: boolean): string {
  const map: Record<string, string> = {
    ORDER_COST: "order_debit",
    PAYMENT: "payment_credit",
    REFUND: "return_credit",
    MANUAL_ADJUSTMENT: "adjustment",
    SERVICE_FEE: "order_debit",
    SHIPPING_FEE: "order_debit",
    PACKAGING_FEE: "order_debit",
    MODULE_PAYMENT: "payment_credit",
    PRODUCT_PACKAGE_PAYMENT: "payment_credit",
    order_debit: "order_debit",
    term_fee: "term_fee",
    return_credit: "return_credit",
    payment_credit: "payment_credit",
  };
  if (map[type]) return map[type];
  return isCredit ? "payment_credit" : "order_debit";
}

export async function getDealerAccount(dealerId: string) {
  return prisma.dealerAccount.findUnique({ where: { dealerId } });
}

export async function ensureDealerAccount(dealerId: string) {
  let account = await prisma.dealerAccount.findUnique({ where: { dealerId } });
  if (!account) {
    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
    const creditLimit = dealer?.creditLimit ?? 0;
    const openingBalance = dealer?.balance ?? 0;
    account = await prisma.dealerAccount.create({
      data: {
        dealerId,
        creditLimit,
        availableLimit: Math.max(0, creditLimit - Math.max(0, -openingBalance)),
        currentBalance: openingBalance,
        riskLevel: computeRiskLevel(openingBalance, creditLimit),
      },
    });
  }
  return account;
}

export async function syncLegacyDealerBalance(dealerId: string) {
  const account = await ensureDealerAccount(dealerId);
  await prisma.dealer.update({
    where: { id: dealerId },
    data: { balance: account.currentBalance },
  });
  return account.currentBalance;
}

async function mirrorLegacyTransaction(params: {
  dealerId: string;
  type: string;
  title: string;
  debit: number;
  credit: number;
  orderId?: string;
  notes?: string;
  balanceAfter: number;
}) {
  if (!shouldMirrorLegacyTransaction()) return;

  const amount = params.debit > 0 ? params.debit : params.credit;
  const legacyType = mapTypeToLegacy(params.type, params.credit > 0);

  let legacyOrderId: string | null = null;
  if (params.orderId) {
    const coreOrder = await prisma.order.findUnique({ where: { id: params.orderId }, select: { id: true } });
    if (coreOrder) legacyOrderId = params.orderId;
  }

  await prisma.dealerTransaction.create({
    data: {
      dealerId: params.dealerId,
      type: legacyType,
      amount,
      orderId: legacyOrderId,
      note: params.notes || params.title || (params.orderId && !legacyOrderId ? `ref:${params.orderId}` : ""),
      balanceAfter: params.balanceAfter,
    },
  });
}

export async function postAccountTransaction(params: PostAccountTransactionParams) {
  const account = await ensureDealerAccount(params.dealerId);
  const debit = params.debit ?? 0;
  const credit = params.credit ?? 0;
  // Wallet semantics: charges reduce balance, payments increase balance
  const balanceAfter = account.currentBalance - debit + credit;
  const availableLimit = account.creditLimit - Math.max(0, -balanceAfter);

  const tx = await prisma.dealerAccountTransaction.create({
    data: {
      accountId: account.id,
      dealerId: params.dealerId,
      orderId: params.orderId || null,
      coreOrderId: params.coreOrderId || null,
      invoiceId: params.invoiceId || null,
      type: params.type,
      title: params.title,
      debit,
      credit,
      balanceAfter,
      notes: params.notes || "",
    },
  });

  await prisma.dealerAccount.update({
    where: { id: account.id },
    data: {
      currentBalance: balanceAfter,
      availableLimit: Math.max(0, availableLimit),
      riskLevel: computeRiskLevel(balanceAfter, account.creditLimit),
    },
  });

  await syncLegacyDealerBalance(params.dealerId);

  await mirrorLegacyTransaction({
    dealerId: params.dealerId,
    type: params.type,
    title: params.title,
    debit,
    credit,
    orderId: params.legacyOrderId || params.orderId || params.coreOrderId,
    notes: params.notes,
    balanceAfter,
  });

  return tx;
}

export async function getDealerBalance(dealerId: string): Promise<DealerBalanceInfo> {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { balance: true, creditLimit: true, allowNegative: true },
  });
  if (!dealer) {
    return { balance: 0, creditLimit: 0, allowNegative: false, availableLimit: 0, riskLevel: "LOW", source: "legacy_balance" };
  }

  if (isDealerAccountEngine()) {
    const account = await ensureDealerAccount(dealerId);
    return {
      balance: account.currentBalance,
      creditLimit: account.creditLimit,
      allowNegative: dealer.allowNegative,
      availableLimit: account.availableLimit,
      riskLevel: account.riskLevel,
      source: "dealer_account",
    };
  }

  return {
    balance: dealer.balance,
    creditLimit: dealer.creditLimit,
    allowNegative: dealer.allowNegative,
    availableLimit: Math.max(0, dealer.creditLimit - Math.max(0, -dealer.balance)),
    riskLevel: computeRiskLevel(dealer.balance, dealer.creditLimit),
    source: "legacy_balance",
  };
}

export async function checkDealerCredit(dealerId: string, orderTotal: number): Promise<{ ok: boolean; message: string }> {
  const { balance, creditLimit, allowNegative } = await getDealerBalance(dealerId);
  const newBalance = balance - orderTotal;
  if (!allowNegative && newBalance < 0) {
    return { ok: false, message: `Yetersiz bakiye. Mevcut: ${balance.toLocaleString("tr-TR")} ₺` };
  }
  if (allowNegative && creditLimit > 0 && -newBalance > creditLimit) {
    return { ok: false, message: `Kredi limiti aşıldı. Limit: ${creditLimit.toLocaleString("tr-TR")} ₺` };
  }
  return { ok: true, message: "" };
}

export async function deductDealerBalance(
  dealerId: string,
  amount: number,
  orderId?: string,
  type = "ORDER_COST",
  note = "Sipariş kesintisi"
) {
  if (!isDealerAccountEngine()) {
    await prisma.dealer.update({ where: { id: dealerId }, data: { balance: { decrement: amount } } });
    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId }, select: { balance: true } });
    await prisma.dealerTransaction.create({
      data: {
        dealerId,
        type: mapTypeToLegacy(type, false),
        amount,
        orderId: orderId || null,
        note,
        balanceAfter: dealer?.balance ?? 0,
      },
    });
    return;
  }

  await postAccountTransaction({
    dealerId,
    type,
    title: note,
    debit: amount,
    legacyOrderId: orderId,
    notes: note,
  });
}

export async function addDealerBalance(
  dealerId: string,
  amount: number,
  orderId?: string,
  type = "REFUND",
  note = "Bakiye iadesi"
) {
  if (!isDealerAccountEngine()) {
    await prisma.dealer.update({ where: { id: dealerId }, data: { balance: { increment: amount } } });
    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId }, select: { balance: true } });
    await prisma.dealerTransaction.create({
      data: {
        dealerId,
        type: mapTypeToLegacy(type, true),
        amount,
        orderId: orderId || null,
        note,
        balanceAfter: dealer?.balance ?? 0,
      },
    });
    return;
  }

  await postAccountTransaction({
    dealerId,
    type,
    title: note,
    credit: amount,
    legacyOrderId: orderId,
    notes: note,
  });
}

export async function postOrderCostToAccount(dealerId: string, orderId: string) {
  const coreOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { costItems: true },
  });
  if (coreOrder && coreOrder.totalCost > 0) {
    return postCoreOrderCostToAccount(dealerId, orderId);
  }

  const order = await prisma.dealerOrder.findUnique({
    where: { id: orderId },
    include: { costItems: true },
  });
  if (!order || order.totalCost <= 0) return null;

  const existing = await prisma.dealerAccountTransaction.findFirst({
    where: { OR: [{ orderId }, { coreOrderId: orderId }], type: "ORDER_COST" },
  });
  if (existing) return existing;

  return postAccountTransaction({
    dealerId,
    orderId,
    type: "ORDER_COST",
    title: `Sipariş maliyeti ${order.orderNumber}`,
    debit: order.totalCost,
    notes: "Otomatik cari işlemi",
  });
}

async function postCoreOrderCostToAccount(dealerId: string, coreOrderId: string) {
  const { postCoreOrderCostToAccount: postCore } = await import("@/lib/orders/accounting-bridge");
  return postCore(dealerId, coreOrderId);
}

export async function getAccountSummary(dealerId: string) {
  const account = await ensureDealerAccount(dealerId);
  const txs = await prisma.dealerAccountTransaction.findMany({
    where: { dealerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const totalDebit = txs.reduce((s, t) => s + t.debit, 0);
  const totalCredit = txs.reduce((s, t) => s + t.credit, 0);
  return {
    account,
    totalDebit,
    totalCredit,
    recentTransactions: txs,
    engine: getAccountingEngine(),
  };
}

export type StatementLine = {
  date: string;
  title: string;
  debit: number;
  credit: number;
  balance: number;
  type?: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  coreOrderId?: string | null;
};

export async function createStatement(dealerId: string, year: number, month: number) {
  return generateMonthlyStatement(dealerId, year, month);
}

export async function generateMonthlyStatement(dealerId: string, year: number, month: number) {
  const account = await ensureDealerAccount(dealerId);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const prevTxs = await prisma.dealerAccountTransaction.findMany({
    where: { dealerId, createdAt: { lt: start } },
    orderBy: { createdAt: "asc" },
  });
  const openingBalance = prevTxs.reduce((b, t) => b - t.debit + t.credit, 0);

  const monthTxs = await prisma.dealerAccountTransaction.findMany({
    where: { dealerId, createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "asc" },
    include: {
      invoice: { select: { id: true, number: true } },
    },
  });

  let running = openingBalance;
  const lines: StatementLine[] = monthTxs.map((t) => {
    running = running - t.debit + t.credit;
    const invoiceRef = t.invoice?.number ? ` [${t.invoice.number}]` : "";
    return {
      date: t.createdAt.toISOString(),
      title: `${t.title || t.type}${invoiceRef}`,
      debit: t.debit,
      credit: t.credit,
      balance: running,
      type: t.type,
      invoiceId: t.invoiceId,
      invoiceNumber: t.invoice?.number || null,
      coreOrderId: t.coreOrderId,
    };
  });

  const totalDebit = monthTxs.reduce((s, t) => s + t.debit, 0);
  const totalCredit = monthTxs.reduce((s, t) => s + t.credit, 0);
  const closingBalance = openingBalance - totalDebit + totalCredit;

  const statement = await prisma.dealerStatement.upsert({
    where: { dealerId_periodYear_periodMonth: { dealerId, periodYear: year, periodMonth: month } },
    create: {
      accountId: account.id,
      dealerId,
      periodYear: year,
      periodMonth: month,
      openingBalance,
      closingBalance,
      totalDebit,
      totalCredit,
      linesJson: JSON.stringify(lines),
    },
    update: {
      openingBalance,
      closingBalance,
      totalDebit,
      totalCredit,
      linesJson: JSON.stringify(lines),
      generatedAt: new Date(),
    },
  });

  return { statement, lines };
}

export type BalanceDivergence = {
  dealerId: string;
  name: string;
  company: string;
  dealerBalance: number;
  accountBalance: number;
  difference: number;
};

export async function findBalanceDivergences(limit = 50): Promise<BalanceDivergence[]> {
  const dealers = await prisma.dealer.findMany({
    where: { status: "active" },
    select: { id: true, name: true, company: true, balance: true },
    take: 200,
  });

  const divergences: BalanceDivergence[] = [];
  for (const d of dealers) {
    const account = await prisma.dealerAccount.findUnique({ where: { dealerId: d.id } });
    const accountBalance = account?.currentBalance ?? d.balance;
    const diff = Math.abs(d.balance - accountBalance);
    if (diff > 0.01) {
      divergences.push({
        dealerId: d.id,
        name: d.name,
        company: d.company,
        dealerBalance: d.balance,
        accountBalance,
        difference: diff,
      });
    }
  }

  return divergences.slice(0, limit);
}

export function mapAccountTxToLegacyShape(tx: {
  id: string;
  type: string;
  title: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  notes: string;
  orderId: string | null;
  createdAt: Date;
}) {
  const isCredit = tx.credit > 0;
  return {
    id: tx.id,
    type: isCredit ? mapTypeToLegacy(tx.type, true) : mapTypeToLegacy(tx.type, false),
    amount: isCredit ? tx.credit : tx.debit,
    note: tx.notes || tx.title,
    balanceAfter: tx.balanceAfter,
    orderId: tx.orderId,
    createdAt: tx.createdAt,
    debit: tx.debit,
    credit: tx.credit,
    title: tx.title,
    source: "dealer_account" as const,
  };
}
