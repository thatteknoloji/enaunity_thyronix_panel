import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateInvoiceNumber } from "@/lib/invoices/invoice-service";
import { postInvoiceAccountTransaction } from "@/lib/invoices/invoice-accounting-bridge";

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        items: true,
        dealer: { select: { id: true, company: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, data: invoices });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const number = body.number || generateInvoiceNumber();
    const subtotal = (body.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const discount = body.discount || 0;
    const afterDiscount = subtotal - discount;
    const taxRate = body.taxRate || 20;
    const taxAmount = afterDiscount * (taxRate / 100);
    const total = afterDiscount + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        number,
        type: body.type || "invoice",
        status: body.status || "draft",
        sourceType: body.sourceType || "MANUAL",
        paymentStatus: "UNPAID",
        paidAmount: 0,
        orderId: body.orderId || null,
        dealerId: body.dealerId || null,
        currency: body.currency || "TRY",
        subtotal,
        taxRate,
        taxAmount,
        discount,
        total,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || "",
        items: {
          create: (body.items || []).map((item: any) => ({
            productId: item.productId || null,
            productName: item.productName,
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            total: (item.quantity || 1) * (item.unitPrice || 0),
          })),
        },
      },
      include: { items: true, dealer: { select: { id: true, company: true, name: true, email: true } } },
    });

    if (body.dealerId && (body.status === "issued" || body.status === "sent") && total > 0) {
      await postInvoiceAccountTransaction({
        dealerId: body.dealerId,
        invoiceId: invoice.id,
        coreOrderId: body.orderId || undefined,
        type: "INVOICE",
        debit: total,
        title: `Fatura ${invoice.number}`,
        notes: "Manuel fatura",
      });
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, items, ...body } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    const existing = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    if (existing.status !== "draft") {
      return NextResponse.json({ success: false, error: "Sadece taslak faturalar düzenlenebilir" }, { status: 400 });
    }

    const subtotal = items
      ? items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)
      : existing.subtotal;
    const discount = body.discount ?? existing.discount;
    const afterDiscount = subtotal - discount;
    const taxRate = body.taxRate ?? existing.taxRate;
    const taxAmount = afterDiscount * (taxRate / 100);
    const total = afterDiscount + taxAmount;

    if (items) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...body,
        subtotal,
        taxRate,
        taxAmount,
        discount,
        total,
        dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate,
        items: items ? {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            productName: item.productName,
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            total: (item.quantity || 1) * (item.unitPrice || 0),
          })),
        } : undefined,
      },
      include: { items: true, dealer: { select: { id: true, company: true, name: true, email: true } } },
    });

    return NextResponse.json({ success: true, data: invoice });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
