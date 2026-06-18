import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertCustomerProductsAccess, getCustomerPayments } from "@/lib/customer-products/service";

export async function GET(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum gerekli" }, { status: 401 });
    }

    const dealerId = new URL(req.url).searchParams.get("dealerId");
    assertCustomerProductsAccess(user, dealerId);
    const data = await getCustomerPayments(user, dealerId || undefined);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sunucu hatası";
    const status = message.includes("erişim") ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
