import { ensureInvoiceForOrder, isOrderInvoiceEligible } from "./invoice-service";

export async function maybeCreateInvoiceForOrder(orderId: string) {
  const { prisma } = await import("@/lib/db");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, fulfillmentStatus: true, sourceType: true, marketplace: true, dealerId: true },
  });
  if (!order?.dealerId) return null;
  if (!isOrderInvoiceEligible(order)) return null;
  const result = await ensureInvoiceForOrder(orderId);
  return result.invoice;
}

export async function onOrderStatusChanged(orderId: string, newStatus: string) {
  const eligible = ["approved", "processing", "APPROVED", "PROCESSING"].includes(newStatus);
  if (!eligible) return null;
  return maybeCreateInvoiceForOrder(orderId);
}

export async function onFulfillmentStatusChanged(orderId: string, fulfillmentStatus: string) {
  const eligible = ["PROCESSING", "READY_TO_SHIP", "READY_TO_SHIPMENT", "WAITING_FOR_SHIPMENT", "WAITING_FOR_PACKING"].includes(
    fulfillmentStatus.toUpperCase()
  );
  if (!eligible) return null;
  return maybeCreateInvoiceForOrder(orderId);
}
