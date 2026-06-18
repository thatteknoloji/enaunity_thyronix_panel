import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { getAccountSummary } from "@/lib/fulfillment/accounts";

export async function GET() {
  try {
    const user = await requireDealer();
    const summary = await getAccountSummary(user.dealerId!);
    return NextResponse.json({ success: true, data: summary });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
