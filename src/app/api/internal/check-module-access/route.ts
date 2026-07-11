import { NextResponse } from "next/server";
import { hasModuleAccess, getDealerApprovalStatus } from "@/lib/modules/access";
import { isDealerApprovalActive } from "@/lib/dealer/dealer-status";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dealerId = searchParams.get("dealerId") || "";
  const moduleKey = searchParams.get("moduleKey") || "";
  if (!dealerId || !moduleKey) return NextResponse.json({ access: false, reason: "Eksik parametre" });

  const approval = await getDealerApprovalStatus(dealerId);
  if (!approval || !isDealerApprovalActive(approval.status)) return NextResponse.json({ access: false, reason: "BAYI_ONAYI_YOK" });

  const hasAccess = await hasModuleAccess(dealerId, moduleKey);
  if (!hasAccess) return NextResponse.json({ access: false, reason: "LISANS_YOK" });

  return NextResponse.json({ access: true });
}
