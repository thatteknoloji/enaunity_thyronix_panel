import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { requestPackagePurchase } from "@/lib/product-library/package-access-service";

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    const body = await req.json();
    const { packageId, paymentMethod } = body;
    if (!packageId) {
      return NextResponse.json({ success: false, error: "Paket ID zorunlu" }, { status: 400 });
    }

    const result = await requestPackagePurchase(user.dealerId!, packageId, { paymentMethod });
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Satın alma hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
