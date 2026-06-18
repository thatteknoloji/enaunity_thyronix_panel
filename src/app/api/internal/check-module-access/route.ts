import { NextResponse } from "next/server";
import { hasModuleAccess, getDealerApprovalStatus } from "@/lib/modules/access";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dealerId = searchParams.get("dealerId") || "";
  const moduleKey = searchParams.get("moduleKey") || "";
  if (!dealerId || !moduleKey) return NextResponse.json({ access: false, reason: "Eksik parametre" });

  const approval = await getDealerApprovalStatus(dealerId);
  if (!approval || approval.status !== "ACTIVE") return NextResponse.json({ access: false, reason: "BAYI_ONAYI_YOK" });

  const hasAccess = await hasModuleAccess(dealerId, moduleKey);
  if (!hasAccess) return NextResponse.json({ access: false, reason: "LISANS_YOK" });

  return NextResponse.json({ access: true });
}
