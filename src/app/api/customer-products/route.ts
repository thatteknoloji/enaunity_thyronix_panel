import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCustomerProductsOverview } from "@/lib/customer-products/service";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum gerekli", code: "AUTH_REQUIRED" }, { status: 401 });
    }

    const data = await getCustomerProductsOverview(user);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sunucu hatası";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
