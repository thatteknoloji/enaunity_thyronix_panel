import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, logAdminAction } from "@/lib/auth";
import {
  checklistComplete,
  MEMBER_CHECKLIST_KEYS,
  parseMemberChecklist,
  type MemberChecklist,
} from "@/lib/members/checklist";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        company: true,
        taxNumber: true,
        taxOffice: true,
        approvalChecklistJson: true,
        rejectionReason: true,
        approvedAt: true,
        reviewedBy: true,
        createdAt: true,
        dealerId: true,
        _count: { select: { orders: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "Üye bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: { ...user, checklist: parseMemberChecklist(user.approvalChecklistJson) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role === "admin") {
      return NextResponse.json({ success: false, error: "Üye bulunamadı" }, { status: 404 });
    }

    if (body.action === "approve") {
      const checklist = body.checklist
        ? normalizeChecklist(body.checklist, parseMemberChecklist(user.approvalChecklistJson))
        : parseMemberChecklist(user.approvalChecklistJson);

      if (!checklistComplete(checklist)) {
        return NextResponse.json(
          { success: false, error: "Onay için 8 koşulun tamamı işaretlenmelidir" },
          { status: 400 }
        );
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          status: "active",
          approvalChecklistJson: JSON.stringify(checklist),
          rejectionReason: "",
          approvedAt: new Date(),
          reviewedBy: admin.name,
        },
      });

      await logAdminAction(admin.id, admin.name, "member_approve", user.email, user.name);
      return NextResponse.json({ success: true, data: updated });
    }

    if (body.action === "reject") {
      const reason = String(body.reason || "").trim();
      if (!reason) {
        return NextResponse.json({ success: false, error: "Red sebebi gerekli" }, { status: 400 });
      }
      const updated = await prisma.user.update({
        where: { id },
        data: {
          status: "rejected",
          rejectionReason: reason,
          reviewedBy: admin.name,
        },
      });
      await logAdminAction(admin.id, admin.name, "member_reject", user.email, reason);
      return NextResponse.json({ success: true, data: updated });
    }

    if (body.action === "suspend") {
      const updated = await prisma.user.update({
        where: { id },
        data: { status: "suspended", reviewedBy: admin.name },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (body.checklist) {
      const checklist = normalizeChecklist(body.checklist, parseMemberChecklist(user.approvalChecklistJson));
      const updated = await prisma.user.update({
        where: { id },
        data: { approvalChecklistJson: JSON.stringify(checklist) },
      });
      return NextResponse.json({
        success: true,
        data: { ...updated, checklist },
      });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

function normalizeChecklist(input: Partial<MemberChecklist>, current: MemberChecklist): MemberChecklist {
  const out = { ...current };
  for (const key of MEMBER_CHECKLIST_KEYS) {
    if (typeof input[key] === "boolean") out[key] = input[key];
  }
  return out;
}
