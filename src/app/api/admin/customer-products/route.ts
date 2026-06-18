import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminCustomerProducts } from "@/lib/customer-products/service";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getAdminCustomerProducts();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sunucu hatası";
    const status = message.includes("Yetkisiz") || message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
