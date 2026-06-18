/**
 * Invoice & Financial Flow Convergence tests
 * Run: npm run test:invoice-convergence
 */
import { prisma } from "../src/lib/db";
import { buildInvoicePdfData } from "../src/lib/invoices/invoice-pdf";
import {
  createInvoiceFromOrder,
  recordInvoicePayment,
  findInvoiceByOrderId,
  isOrderInvoiceEligible,
} from "../src/lib/invoices/invoice-service";
import { isInvoiceModelEngine } from "../src/lib/invoices/config";
import { generateMonthlyStatement } from "../src/lib/accounting/accounting-service";
import { generateOrderNumber } from "../src/lib/fulfillment/types";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

async function cleanup(dealerId: string) {
  const orders = await prisma.order.findMany({ where: { dealerId, orderNumber: { startsWith: "INV-TEST-" } }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);
  await prisma.dealerAccountTransaction.deleteMany({ where: { dealerId } });
  await prisma.payment.deleteMany({ where: { dealerId } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { dealerId } } });
  await prisma.invoice.deleteMany({ where: { dealerId } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.dealerStatement.deleteMany({ where: { dealerId } });
  await prisma.dealerAccount.deleteMany({ where: { dealerId } });
}

async function main() {
  console.log("\n=== Invoice Convergence Tests ===\n");

  process.env.INVOICE_ENGINE = "invoice_model";
  process.env.LEGACY_ORDER_PDF_ENABLED = "false";
  process.env.ACCOUNTING_ENGINE = "dealer_account";

  assert(isInvoiceModelEngine(), "INVOICE_ENGINE=invoice_model active");

  const dealer = await prisma.dealer.findFirst({ where: { status: "active" } });
  const user = await prisma.user.findFirst({ where: { dealerId: dealer?.id } }) || await prisma.user.findFirst();
  const product = await prisma.product.findFirst();
  if (!dealer || !user || !product) {
    console.error("Test prerequisites missing (dealer/user/product)");
    process.exit(1);
  }

  await cleanup(dealer.id);

  console.log("1) Order → Invoice");
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      dealerId: dealer.id,
      total: 1200,
      address: "Test adres",
      status: "approved",
      fulfillmentStatus: "PROCESSING",
      sourceType: "B2B",
      orderNumber: `INV-TEST-${generateOrderNumber()}`,
      items: {
        create: [{ productId: product.id, quantity: 2, price: 600, name: product.name }],
      },
    },
    include: { items: true },
  });
  assert(isOrderInvoiceEligible(order), "Order is invoice eligible");

  const created = await createInvoiceFromOrder(order.id, { force: true });
  assert(created.created === true, "Invoice created from order");
  assert(!!created.invoice?.number, "Invoice number assigned");
  assert(created.invoice?.sourceType === "B2B", "SourceType B2B");

  console.log("\n2) Duplicate invoice blocked");
  const dup = await createInvoiceFromOrder(order.id, { force: true });
  assert(dup.duplicate === true, "Duplicate invoice blocked");

  console.log("\n3) Marketplace → Invoice");
  const mpOrder = await prisma.order.create({
    data: {
      userId: user.id,
      dealerId: dealer.id,
      total: 500,
      address: "Marketplace",
      status: "processing",
      fulfillmentStatus: "WAITING_FOR_PACKING",
      sourceType: "MARKETPLACE",
      marketplace: "TRENDYOL",
      marketplaceOrderId: `MP-${Date.now()}`,
      orderNumber: `INV-TEST-${generateOrderNumber()}`,
      items: { create: [{ quantity: 1, price: 500, name: "MP Ürün" }] },
    },
  });
  const mpInv = await createInvoiceFromOrder(mpOrder.id, { force: true });
  assert(mpInv.invoice?.sourceType === "MARKETPLACE", "Marketplace sourceType");

  console.log("\n4) Invoice → DealerAccountTransaction");
  const invTx = await prisma.dealerAccountTransaction.findFirst({
    where: { invoiceId: created.invoice!.id, type: "INVOICE" },
  });
  assert(!!invTx && invTx.debit > 0, "INVOICE transaction created");

  console.log("\n5) Invoice → Payment");
  const payResult = await recordInvoicePayment({
    invoiceId: created.invoice!.id,
    amount: created.invoice!.total,
    note: "Test ödeme",
  });
  assert(payResult.invoice.paymentStatus === "PAID", "Invoice marked PAID");
  assert(payResult.payment.invoiceId === created.invoice!.id, "Payment linked to invoice");

  console.log("\n6) Payment → DealerAccountTransaction");
  const payTx = await prisma.dealerAccountTransaction.findFirst({
    where: { invoiceId: created.invoice!.id, type: "PAYMENT" },
  });
  assert(!!payTx && payTx.credit > 0, "PAYMENT transaction created");

  console.log("\n7) Statement generation with invoice refs");
  const now = new Date();
  const stmt = await generateMonthlyStatement(dealer.id, now.getFullYear(), now.getMonth() + 1);
  const lines = JSON.parse(stmt.statement.linesJson);
  const hasInvoiceRef = lines.some((l: any) => l.invoiceNumber || (l.title && l.title.includes("ENA-")));
  assert(lines.length > 0, "Statement has lines");
  assert(hasInvoiceRef, "Statement includes invoice reference");

  console.log("\n8) PDF data generation");
  const full = await findInvoiceByOrderId(order.id);
  assert(!!full, "Invoice fetchable by orderId");
  const pdfData = buildInvoicePdfData(full!);
  assert(pdfData.number === full!.number, "PDF data matches invoice");
  assert(pdfData.items.length > 0, "PDF data has items");

  console.log("\n9) Audit script");
  const { execSync } = await import("child_process");
  try {
    execSync("npm run audit:invoice-convergence", { stdio: "pipe" });
    assert(true, "audit:invoice-convergence runs");
  } catch {
    assert(false, "audit:invoice-convergence runs");
  }

  await cleanup(dealer.id);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
