import { postAccountTransaction } from "@/lib/accounting/accounting-service";
import { prisma } from "@/lib/db";

export async function postCoreOrderCostToAccount(dealerId: string, coreOrderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: coreOrderId },
    include: { costItems: true },
  });
  if (!order || order.totalCost <= 0) return null;

  const existing = await prisma.dealerAccountTransaction.findFirst({
    where: { coreOrderId, type: "ORDER_COST" },
  });
  if (existing) return existing;

  return postAccountTransaction({
    dealerId,
    coreOrderId,
    type: "ORDER_COST",
    title: `Sipariş maliyeti ${order.orderNumber || coreOrderId.slice(0, 8)}`,
    debit: order.totalCost,
    notes: "Otomatik cari işlemi (Core Order)",
  });
}
