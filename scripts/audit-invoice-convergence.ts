/**
 * Invoice Convergence audit — read-only
 * Run: npm run audit:invoice-convergence
 */
import { prisma } from "../src/lib/db";

async function main() {
  console.log("\n=== Invoice Convergence Audit (read-only) ===\n");

  const eligibleOrders = await prisma.order.findMany({
    where: {
      dealerId: { not: null },
      OR: [
        { status: { in: ["approved", "processing", "APPROVED", "PROCESSING"] } },
        { fulfillmentStatus: { in: ["PROCESSING", "READY_TO_SHIP", "WAITING_FOR_PACKING", "WAITING_FOR_SHIPMENT"] } },
      ],
    },
    select: { id: true, orderNumber: true, status: true, fulfillmentStatus: true, dealerId: true },
  });

  const invoices = await prisma.invoice.findMany({
    select: { id: true, number: true, orderId: true, dealerId: true, paymentStatus: true, total: true, paidAmount: true },
  });

  const invoiceByOrder = new Map(invoices.filter((i) => i.orderId).map((i) => [i.orderId!, i]));
  const ordersWithoutInvoice = eligibleOrders.filter((o) => !invoiceByOrder.has(o.id));

  const orphanInvoices = invoices.filter((i) => i.orderId && !eligibleOrders.find((o) => o.id === i.orderId));
  const orderIds = new Set((await prisma.order.findMany({ select: { id: true } })).map((o) => o.id));
  const invoiceOrphanOrder = invoices.filter((i) => i.orderId && !orderIds.has(i.orderId));

  const unpaidInvoices = invoices.filter((i) => ["UNPAID", "PARTIAL"].includes(i.paymentStatus));
  const paymentsWithoutInvoice = await prisma.payment.count({ where: { invoiceId: null, orderId: { not: null } } });

  const invoiceIds = new Set(invoices.map((i) => i.id));
  const invoiceTxs = await prisma.dealerAccountTransaction.findMany({
    where: { type: "INVOICE", invoiceId: { not: null } },
    select: { invoiceId: true },
  });
  const invoicesWithoutTx = invoices.filter(
    (i) => i.total > 0 && !invoiceTxs.some((t) => t.invoiceId === i.id)
  );

  const paymentTxs = await prisma.dealerAccountTransaction.findMany({
    where: { type: "PAYMENT", invoiceId: { not: null } },
    select: { invoiceId: true },
  });
  const paidInvoicesWithoutPaymentTx = invoices.filter(
    (i) => i.paidAmount > 0 && !paymentTxs.some((t) => t.invoiceId === i.id)
  );

  const dealersWithTx = new Set(
    (await prisma.dealerAccountTransaction.findMany({ select: { dealerId: true } })).map((t) => t.dealerId)
  );
  const dealersWithStatements = new Set(
    (await prisma.dealerStatement.findMany({ select: { dealerId: true } })).map((s) => s.dealerId)
  );
  const dealersMissingStatements = [...dealersWithTx].filter((d) => !dealersWithStatements.has(d));

  console.log("Summary:");
  console.log(`  Eligible orders: ${eligibleOrders.length}`);
  console.log(`  Invoices: ${invoices.length}`);
  console.log(`  Orders without invoice: ${ordersWithoutInvoice.length}`);
  console.log(`  Invoices with missing order: ${invoiceOrphanOrder.length}`);
  console.log(`  Unpaid/partial invoices: ${unpaidInvoices.length}`);
  console.log(`  Payments without invoice link: ${paymentsWithoutInvoice}`);
  console.log(`  Invoices without INVOICE tx: ${invoicesWithoutTx.length}`);
  console.log(`  Paid invoices without PAYMENT tx: ${paidInvoicesWithoutPaymentTx.length}`);
  console.log(`  Dealers with tx but no statement: ${dealersMissingStatements.length}`);

  if (ordersWithoutInvoice.length > 0) {
    console.log("\n--- Orders without Invoice (sample) ---");
    ordersWithoutInvoice.slice(0, 10).forEach((o) => {
      console.log(`  • ${o.orderNumber || o.id.slice(0, 8)} status=${o.status} fulfillment=${o.fulfillmentStatus}`);
    });
  }

  if (invoicesWithoutTx.length > 0) {
    console.log("\n--- Invoices without DealerAccountTransaction ---");
    invoicesWithoutTx.slice(0, 10).forEach((i) => console.log(`  • ${i.number} total=${i.total}`));
  }

  if (orphanInvoices.length > 0) {
    console.log(`\n--- Orphan invoice-order refs: ${orphanInvoices.length} ---`);
  }

  console.log("\nAudit complete (read-only).\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
