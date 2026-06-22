import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import {
  canReviewPublishGate,
  reviewPublishGate,
} from "@/lib/page-factory/publish-gate/publish-gate-service";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth/admin-access";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    if (!canReviewPublishGate(user!.role)) {
      return NextResponse.json({ success: false, error: "Review action sadece admin içindir" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const action = body.action as "approve" | "reject" | "needs_review";
    if (!["approve", "reject", "needs_review"].includes(action)) {
      return NextResponse.json({ success: false, error: "Geçersiz action" }, { status: 400 });
    }

    const gate = await prisma.pageFactoryPublishGate.findUnique({ where: { id } });
    if (!gate) {
      return NextResponse.json({ success: false, error: "Gate bulunamadı" }, { status: 404 });
    }

    if (!isAdminRole(user!.role) && gate.dealerId && gate.dealerId !== user!.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const data = await reviewPublishGate(id, action, body.note || "", user!.dealerId || user!.role, user!.role);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Review başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
