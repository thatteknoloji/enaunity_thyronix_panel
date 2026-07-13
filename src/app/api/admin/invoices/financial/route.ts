import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  listInvoices,
  getFinancialCenterSummary,
  recordInvoicePayment,
} from "@/lib/invoices/invoice-service";
import { prisma } from "@/lib/db";
import { generateMonthlyStatement } from "@/lib/accounting/accounting-service";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "invoices";
    const dealerId = searchParams.get("dealerId") || undefined;

    if (tab === "summary") {
      const summary = await getFinancialCenterSummary(dealerId);
      return NextResponse.json({ success: true, data: summary });
    }

    if (tab === "payments") {
      const payments = await prisma.payment.findMany({
        where: { invoiceId: { not: null }, ...(dealerId ? { dealerId } : {}) },
        include: {
          invoice: { select: { id: true, number: true, total: true, paymentStatus: true } },
          dealer: { select: { id: true, company: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return NextResponse.json({ success: true, data: payments });
    }

    if (tab === "statements") {
      const statements = await prisma.dealerStatement.findMany({
        where: dealerId ? { dealerId } : {},
        include: { dealer: { select: { id: true, company: true, name: true } } },
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        take: 100,
      });
      return NextResponse.json({ success: true, data: statements });
    }

    if (tab === "overdue") {
      const invoices = await listInvoices({ dealerId, overdue: true, limit: 200 });
      return NextResponse.json({ success: true, data: invoices });
    }

    if (tab === "reports") {
      const [bySource, byPayment] = await Promise.all([
        prisma.invoice.groupBy({ by: ["sourceType"], _count: true, _sum: { total: true } }),
        prisma.invoice.groupBy({ by: ["paymentStatus"], _count: true, _sum: { total: true } }),
      ]);
      return NextResponse.json({ success: true, data: { bySource, byPayment } });
    }

    const paymentStatus = searchParams.get("paymentStatus") || undefined;
    const sourceType = searchParams.get("sourceType") || undefined;
    const invoices = await listInvoices({ dealerId, paymentStatus, sourceType, limit: 200 });
    return NextResponse.json({ success: true, data: invoices });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (body.action === "record_payment") {
      const result = await recordInvoicePayment({
        invoiceId: body.invoiceId,
        amount: Number(body.amount),
        note: body.note,
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "generate_statement") {
      const result = await generateMonthlyStatement(body.dealerId, body.year, body.month);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
