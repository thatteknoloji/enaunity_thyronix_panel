import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startBalanceTopUp } from "@/lib/payments/balance-topup-service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.dealerId) {
      return NextResponse.json({ success: false, error: "Yalnızca bayiler" }, { status: 403 });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const method = body.method === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CARD";
    const returnUrl = String(body.returnUrl || "/dealer/balance");

    const dealer = await prisma.dealer.findUnique({ where: { id: user.dealerId } });
    if (!dealer) {
      return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });
    }

    const result = await startBalanceTopUp({
      dealerId: user.dealerId,
      amount,
      method,
      returnUrl,
      buyer: {
        name: dealer.name || dealer.company,
        email: dealer.email,
        phone: dealer.phone,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bakiye yükleme başlatılamadı";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
