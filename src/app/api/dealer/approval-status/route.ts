import { NextResponse } from "next/server";
import { getDealerApprovalStatus, hasModuleAccess, getModuleLabel, getStatusLabel } from "@/lib/modules/access";

export async function GET(req: Request) {
  try {
    const dealerId = req.headers.get("x-dealer-id") || "";
    if (!dealerId) return NextResponse.json({ error: "Dealer ID gerekli" }, { status: 400 });

    const approval = await getDealerApprovalStatus(dealerId);
    const thyronix = await hasModuleAccess(dealerId, "THYRONIX");
    const hive = await hasModuleAccess(dealerId, "HIVE");

    return NextResponse.json({
      success: true,
      data: {
        approvalStatus: approval?.status || "PENDING_PROFILE",
        documentStatus: approval?.documentStatus || "PENDING",
        paymentStatus: approval?.paymentStatus || "PENDING",
        modules: {
          THYRONIX: { hasAccess: thyronix, label: getModuleLabel("THYRONIX") },
          HIVE: { hasAccess: hive, label: getModuleLabel("HIVE") },
        },
        statusLabel: getStatusLabel(approval?.status || ""),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}
