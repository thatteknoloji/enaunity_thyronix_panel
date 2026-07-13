import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listPaymentMethodPolicies, upsertPaymentMethodPolicy } from "@/lib/payments/payment-method-policy";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const policies = await listPaymentMethodPolicies();
    const groups = await prisma.dealerGroup.findMany({ select: { name: true } });
    const dealers = await prisma.dealer.findMany({
      select: { id: true, company: true, name: true, group: true },
      take: 500,
    });
    return NextResponse.json({ success: true, data: { policies, groups, dealers } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { scope, scopeKey, cardEnabled, bankTransferEnabled, balanceEnabled } = body;
    if (!scope || !["GLOBAL", "GROUP", "DEALER"].includes(scope)) {
      return NextResponse.json({ success: false, error: "Geçersiz scope" }, { status: 400 });
    }
    const row = await upsertPaymentMethodPolicy({
      scope,
      scopeKey,
      cardEnabled: cardEnabled === null ? null : !!cardEnabled,
      bankTransferEnabled: bankTransferEnabled === null ? null : !!bankTransferEnabled,
      balanceEnabled: balanceEnabled === null ? null : !!balanceEnabled,
      updatedBy: admin.email || admin.name,
    });
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Kayıt hatası" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { scope, scopeKey } = await req.json();
    await prisma.paymentMethodPolicy.delete({
      where: { scope_scopeKey: { scope, scopeKey: scopeKey || "" } },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Silinemedi" }, { status: 500 });
  }
}
