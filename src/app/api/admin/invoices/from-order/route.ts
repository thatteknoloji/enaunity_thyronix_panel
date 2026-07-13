import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createInvoiceFromOrder } from "@/lib/invoices/invoice-service";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId gerekli" }, { status: 400 });
    }

    const result = await createInvoiceFromOrder(orderId, { force: true });
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fatura oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
