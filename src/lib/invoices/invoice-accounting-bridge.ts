import { postAccountTransaction } from "@/lib/accounting/accounting-service";
import { prisma } from "@/lib/db";
import type { FinancialTxType } from "./config";

export async function postInvoiceAccountTransaction(params: {
  dealerId: string;
  invoiceId: string;
  coreOrderId?: string;
  type: FinancialTxType;
  debit?: number;
  credit?: number;
  title: string;
  notes?: string;
}) {
  const existing = await prisma.dealerAccountTransaction.findFirst({
    where: {
      invoiceId: params.invoiceId,
      type: params.type,
      ...(params.debit ? { debit: params.debit } : {}),
      ...(params.credit ? { credit: params.credit } : {}),
    },
  });
  if (existing) return existing;

  return postAccountTransaction({
    dealerId: params.dealerId,
    invoiceId: params.invoiceId,
    coreOrderId: params.coreOrderId,
    type: params.type,
    title: params.title,
    debit: params.debit,
    credit: params.credit,
    notes: params.notes,
  });
}
