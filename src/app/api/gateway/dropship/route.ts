import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { resolveDropshipGatewayStep } from "@/lib/dropship/gateway-state";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Oturum bulunamadı", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  if (isAdminRole(user.role)) {
    return NextResponse.json({ success: true, data: { step: "redirect", redirectTo: "/admin/dropship" } });
  }

  const dealerId = user.dealerId;
  if (!dealerId) {
    return NextResponse.json({ success: false, error: "Bayi hesabı gerekli", code: "DEALER_REQUIRED" }, { status: 403 });
  }

  const step = await resolveDropshipGatewayStep(dealerId);
  return NextResponse.json({ success: true, data: step });
}
