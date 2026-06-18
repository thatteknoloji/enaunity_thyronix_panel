import { prisma } from "@/lib/db";
import {
  isInvoiceModelEngine,
  normalizeInvoiceSourceType,
  type InvoicePaymentStatus,
  type InvoiceSourceType,
} from "./config";
import { postInvoiceAccountTransaction } from "./invoice-accounting-bridge";

const INVOICE_ELIGIBLE_ORDER_STATUSES = new Set([
  "approved",
  "processing",
  "APPROVED",
  "PROCESSING",
]);

const INVOICE_ELIGIBLE_FULFILLMENT_STATUSES = new Set([
  "PROCESSING",
  "READY_TO_SHIP",
  "READY_TO_SHIPMENT",
  "WAITING_FOR_SHIPMENT",
  "WAITING_FOR_PACKING",
]);

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 90000) + 10000);
  return `ENA-${year}${month}-${random}`;
}

export function isOrderInvoiceEligible(order: {
  status: string;
  fulfillmentStatus?: string | null;
  sourceType?: string | null;
  marketplace?: string | null;
}) {
  const status = (order.status || "").toLowerCase();
  const fulfillment = (order.fulfillmentStatus || "").toUpperCase();
  if (INVOICE_ELIGIBLE_ORDER_STATUSES.has(order.status) || INVOICE_ELIGIBLE_ORDER_STATUSES.has(status)) {
    return true;
  }
  if (fulfillment && INVOICE_ELIGIBLE_FULFILLMENT_STATUSES.has(fulfillment)) {
    return true;
  }
  return false;
}

function computeTotals(items: { quantity: number; unitPrice: number }[], discount = 0, taxRate = 20) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;
  return { subtotal, taxAmount, total };
}

function resolvePaymentStatus(paidAmount: number, grandTotal: number): InvoicePaymentStatus {
  if (paidAmount <= 0) return "UNPAID";
  if (paidAmount >= grandTotal - 0.01) return "PAID";
  return "PARTIAL";
}

export async function findInvoiceByOrderId(orderId: string) {
  return prisma.invoice.findFirst({
    where: { orderId },
    include: { items: true, payments: true, dealer: { select: { id: true, company: true, name: true, email: true } } },
  });
}

export async function createInvoiceFromOrder(orderId: string, options?: { force?: boolean }) {
  if (!isInvoiceModelEngine() && !options?.force) {
    return { invoice: null, created: false, skipped: true as const };
  }

  const existing = await findInvoiceByOrderId(orderId);
  if (existing) return { invoice: existing, created: false, duplicate: true as const };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true, productCatalogItem: true } },
      dealer: { select: { id: true, company: true, name: true, email: true } },
    },
  });

  if (!order) throw new Error("Sipariş bulunamadı");
  if (!order.dealerId) throw new Error("Fatura için bayi gerekli");

  if (!options?.force && !isOrderInvoiceEligible(order)) {
    return { invoice: null, created: false, skipped: true as const, reason: "order_not_eligible" };
  }

  const sourceType = normalizeInvoiceSourceType(order.sourceType, order.marketplace);
  const discount = order.discount || 0;
  const taxRate = 20;

  const lineItems = order.items.map((item) => {
    const name = item.name || item.product?.name || item.productCatalogItem?.name || "Ürün";
    return {
      productId: item.productId,
      productName: name,
      description: item.sku ? `SKU: ${item.sku}` : "",
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.quantity * item.price,
    };
  });

  const { subtotal, taxAmount, total } = computeTotals(lineItems, discount, taxRate);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (order.paymentTermDays || 30));

  const invoice = await prisma.invoice.create({
    data: {
      number: generateInvoiceNumber(),
      type: "invoice",
      status: "issued",
      sourceType,
      paymentStatus: "UNPAID",
      paidAmount: 0,
      orderId: order.id,
      dealerId: order.dealerId,
      currency: "TRY",
      subtotal,
      taxRate,
      taxAmount,
      discount,
      total,
      dueDate,
      notes: order.orderNumber
        ? `Sipariş: ${order.orderNumber}`
        : `Sipariş #${order.id.slice(0, 8)}`,
      items: {
        create: lineItems,
      },
    },
    include: {
      items: true,
      payments: true,
      dealer: { select: { id: true, company: true, name: true, email: true } },
    },
  });

  await postInvoiceAccountTransaction({
    dealerId: order.dealerId,
    invoiceId: invoice.id,
    coreOrderId: order.id,
    type: "INVOICE",
    debit: invoice.total,
    title: `Fatura ${invoice.number}`,
    notes: `Otomatik fatura — ${sourceType}`,
  });

  return { invoice, created: true, duplicate: false as const };
}

export async function ensureInvoiceForOrder(orderId: string) {
  try {
    return await createInvoiceFromOrder(orderId);
  } catch (e) {
    console.warn("[invoice] ensureInvoiceForOrder failed:", e instanceof Error ? e.message : e);
    return { invoice: null, created: false, error: true as const };
  }
}

export async function recordInvoicePayment(params: {
  invoiceId: string;
  amount: number;
  note?: string;
  type?: string;
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: { payments: true },
  });
  if (!invoice || !invoice.dealerId) throw new Error("Fatura bulunamadı");

  const payment = await prisma.payment.create({
    data: {
      dealerId: invoice.dealerId,
      orderId: invoice.orderId,
      invoiceId: invoice.id,
      amount: params.amount,
      type: params.type || "payment",
      status: "COMPLETED",
      note: params.note || `Ödeme — ${invoice.number}`,
    },
  });

  const paidAmount = invoice.paidAmount + params.amount;
  const paymentStatus = resolvePaymentStatus(paidAmount, invoice.total);

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      paidAmount,
      paymentStatus,
      status: paymentStatus === "PAID" ? "paid" : invoice.status,
    },
    include: { items: true, payments: true, dealer: { select: { id: true, company: true, name: true, email: true } } },
  });

  await postInvoiceAccountTransaction({
    dealerId: invoice.dealerId,
    invoiceId: invoice.id,
    coreOrderId: invoice.orderId || undefined,
    type: "PAYMENT",
    credit: params.amount,
    title: `Ödeme — ${invoice.number}`,
    notes: params.note || "Fatura ödemesi",
  });

  return { invoice: updated, payment };
}

export async function recordInvoiceRefund(params: {
  invoiceId: string;
  amount: number;
  note?: string;
}) {
  const invoice = await prisma.invoice.findUnique({ where: { id: params.invoiceId } });
  if (!invoice || !invoice.dealerId) throw new Error("Fatura bulunamadı");

  await prisma.payment.create({
    data: {
      dealerId: invoice.dealerId,
      orderId: invoice.orderId,
      invoiceId: invoice.id,
      amount: -params.amount,
      type: "refund",
      status: "REFUNDED",
      note: params.note || `İade — ${invoice.number}`,
    },
  });

  const paidAmount = Math.max(0, invoice.paidAmount - params.amount);
  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      paidAmount,
      paymentStatus: "REFUNDED",
      status: "cancelled",
    },
    include: { items: true, payments: true, dealer: { select: { id: true, company: true, name: true, email: true } } },
  });

  await postInvoiceAccountTransaction({
    dealerId: invoice.dealerId,
    invoiceId: invoice.id,
    coreOrderId: invoice.orderId || undefined,
    type: "REFUND",
    credit: params.amount,
    title: `İade — ${invoice.number}`,
    notes: params.note || "Fatura iadesi",
  });

  return updated;
}

export async function listInvoices(filters?: {
  dealerId?: string;
  paymentStatus?: string;
  sourceType?: string;
  overdue?: boolean;
  limit?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.dealerId) where.dealerId = filters.dealerId;
  if (filters?.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (filters?.sourceType) where.sourceType = filters.sourceType;
  if (filters?.overdue) {
    where.paymentStatus = { in: ["UNPAID", "PARTIAL"] };
    where.dueDate = { lt: new Date() };
  }

  return prisma.invoice.findMany({
    where,
    include: {
      items: true,
      payments: true,
      dealer: { select: { id: true, company: true, name: true, email: true } },
      order: { select: { id: true, orderNumber: true, status: true, fulfillmentStatus: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit || 200,
  });
}

export async function getInvoiceDetail(invoiceId: string, dealerId?: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, ...(dealerId ? { dealerId } : {}) },
    include: {
      items: true,
      payments: true,
      dealer: { select: { id: true, company: true, name: true, email: true, phone: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          fulfillmentStatus: true,
          address: true,
          total: true,
        },
      },
      accountTransactions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function getFinancialCenterSummary(dealerId?: string) {
  const where = dealerId ? { dealerId } : {};
  const [invoices, payments, statements] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.payment.count({ where: { ...where, invoiceId: { not: null } } }),
    prisma.dealerStatement.count({ where }),
  ]);

  const overdue = await prisma.invoice.count({
    where: {
      ...where,
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
      dueDate: { lt: new Date() },
    },
  });

  const unpaidTotal = await prisma.invoice.aggregate({
    where: { ...where, paymentStatus: { in: ["UNPAID", "PARTIAL"] } },
    _sum: { total: true },
  });

  return {
    invoiceCount: invoices,
    paymentCount: payments,
    statementCount: statements,
    overdueCount: overdue,
    unpaidTotal: unpaidTotal._sum.total || 0,
  };
}
