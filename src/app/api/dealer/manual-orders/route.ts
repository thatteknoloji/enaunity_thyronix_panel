import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { createManualOperasyonOrder } from "@/lib/dealer-products/service";

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    if (!user.dealerId) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 403 });
    }
    const body = await req.json();
    const order = await createManualOperasyonOrder(user.dealerId, body);
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sipariş oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
