import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";

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

  const license = await prisma.moduleLicense.findFirst({
    where: { dealerId, moduleKey: "AI_DROPSHIP" },
    orderBy: { createdAt: "desc" },
  });

  if (!license) {
    return NextResponse.json({
      success: true,
      data: { step: "pricing", moduleKey: "AI_DROPSHIP" },
    });
  }

  if (license.status === "ACTIVE" || license.status === "TRIAL") {
    return NextResponse.json({
      success: true,
      data: { step: "redirect", redirectTo: "/dealer/dropship" },
    });
  }

  if (license.status === "PENDING_PAYMENT" || license.status === "PENDING_APPROVAL") {
    return NextResponse.json({
      success: true,
      data: { step: "pending", reason: "Lisansınız onay bekliyor" },
    });
  }

  return NextResponse.json({
    success: true,
    data: { step: "pricing", moduleKey: "AI_DROPSHIP" },
  });
}
