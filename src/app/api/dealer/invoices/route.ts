import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildInvoicePdfData } from "@/lib/invoices/invoice-pdf";
import { listInvoices, getInvoiceDetail } from "@/lib/invoices/invoice-service";
import { prisma } from "@/lib/db";
import { generateMonthlyStatement } from "@/lib/accounting/accounting-service";
import { isLegacyOrderPdfEnabled } from "@/lib/invoices/config";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user?.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "invoices";
    const id = searchParams.get("id");

    if (id) {
      const invoice = await getInvoiceDetail(id, user.dealerId);
      if (!invoice) return NextResponse.json({ success: false, error: "Fatura bulunamadı" }, { status: 404 });
      return NextResponse.json({
        success: true,
        data: invoice,
        pdfData: buildInvoicePdfData(invoice),
        legacyOrderPdfEnabled: isLegacyOrderPdfEnabled(),
      });
    }

    if (tab === "payments") {
      const payments = await prisma.payment.findMany({
        where: { dealerId: user.dealerId, invoiceId: { not: null } },
        include: { invoice: { select: { id: true, number: true, total: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ success: true, data: payments });
    }

    if (tab === "statements") {
      const statements = await prisma.dealerStatement.findMany({
        where: { dealerId: user.dealerId },
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        take: 24,
      });
      return NextResponse.json({ success: true, data: statements });
    }

    const invoices = await listInvoices({ dealerId: user.dealerId, limit: 200 });
    return NextResponse.json({
      success: true,
      data: invoices,
      legacyOrderPdfEnabled: isLegacyOrderPdfEnabled(),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user?.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    }

    const body = await req.json();
    if (body.action === "generate_statement") {
      const now = new Date();
      const year = body.year || now.getFullYear();
      const month = body.month || now.getMonth() + 1;
      const result = await generateMonthlyStatement(user.dealerId, year, month);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
