import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getMemberWithDetails,
  promoteMemberToDealer,
  syncMemberChecklistSnapshot,
  parseAdminWaivers,
  type MemberProfileInput,
} from "@/lib/members/service";
import { MEMBER_REQUIRED_DOCUMENTS } from "@/lib/members/checklist";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await getMemberWithDetails(id);
    if (!data) return NextResponse.json({ success: false, error: "Üye bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const user = await prisma.user.findUnique({
      where: { id },
      include: { memberDocuments: true },
    });
    if (!user || user.role === "admin") {
      return NextResponse.json({ success: false, error: "Üye bulunamadı" }, { status: 404 });
    }

    if (body.action === "update_profile") {
      const patch: MemberProfileInput = body.profile || {};
      await prisma.user.update({
        where: { id },
        data: {
          ...(patch.name ? { name: patch.name } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          ...(patch.company !== undefined ? { company: patch.company } : {}),
          ...(patch.taxNumber !== undefined ? { taxNumber: patch.taxNumber } : {}),
          ...(patch.taxOffice !== undefined ? { taxOffice: patch.taxOffice } : {}),
          ...(patch.adminNote !== undefined ? { adminNote: patch.adminNote } : {}),
        },
      });
      await syncMemberChecklistSnapshot(id);
      const data = await getMemberWithDetails(id);
      return NextResponse.json({ success: true, data });
    }

    if (body.action === "review_document") {
      const { documentId, status, adminNote } = body;
      if (!["approved", "rejected", "pending"].includes(status)) {
        return NextResponse.json({ success: false, error: "Geçersiz evrak durumu" }, { status: 400 });
      }
      await prisma.memberDocument.update({
        where: { id: documentId, userId: id },
        data: { status, adminNote: adminNote || "" },
      });
      await syncMemberChecklistSnapshot(id);
      const data = await getMemberWithDetails(id);
      return NextResponse.json({ success: true, data });
    }

    if (body.action === "update_waivers") {
      const current = parseAdminWaivers(user.adminApprovalWaiversJson);
      const checklistKeys = Array.isArray(body.checklistKeys)
        ? body.checklistKeys.filter((k: string) => typeof k === "string")
        : current.checklistKeys;
      const documentTypes = Array.isArray(body.documentTypes)
        ? body.documentTypes.filter((t: string) =>
            (MEMBER_REQUIRED_DOCUMENTS as readonly string[]).includes(t)
          )
        : current.documentTypes;
      await prisma.user.update({
        where: { id },
        data: {
          adminApprovalWaiversJson: JSON.stringify({ checklistKeys, documentTypes }),
        },
      });
      await syncMemberChecklistSnapshot(id);
      const data = await getMemberWithDetails(id);
      return NextResponse.json({ success: true, data });
    }

    if (body.action === "approve") {
      const dataBefore = await getMemberWithDetails(id);
      if (!dataBefore?.adminApprovalReady) {
        const missing = dataBefore?.checklist.filter((c) => !c.ok).map((c) => c.label).join(", ");
        return NextResponse.json(
          { success: false, error: `Onay için tüm koşullar tamamlanmalı veya muaf tutulmalı. Eksik: ${missing}` },
          { status: 400 }
        );
      }

      const fresh = await prisma.user.findUnique({
        where: { id },
        include: { memberDocuments: true },
      });
      if (!fresh) return NextResponse.json({ success: false, error: "Üye bulunamadı" }, { status: 404 });

      const checklist = dataBefore.checklist;
      await prisma.user.update({
        where: { id },
        data: {
          status: "active",
          rejectionReason: "",
          approvedAt: new Date(),
          reviewedBy: admin.name,
          approvalChecklistJson: JSON.stringify(Object.fromEntries(checklist.map((c) => [c.key, c.ok]))),
        },
      });
      await logAdminAction(admin.id, admin.name, "member_approve", user.email, user.name);
      const data = await getMemberWithDetails(id);
      return NextResponse.json({ success: true, data });
    }

    if (body.action === "reject") {
      const reason = String(body.reason || "").trim();
      if (!reason) return NextResponse.json({ success: false, error: "Red sebebi gerekli" }, { status: 400 });
      await prisma.user.update({
        where: { id },
        data: { status: "rejected", rejectionReason: reason, reviewedBy: admin.name },
      });
      await logAdminAction(admin.id, admin.name, "member_reject", user.email, reason);
      const data = await getMemberWithDetails(id);
      return NextResponse.json({ success: true, data });
    }

    if (body.action === "reopen") {
      await prisma.user.update({
        where: { id },
        data: { status: "pending", rejectionReason: "", reviewedBy: admin.name },
      });
      const data = await getMemberWithDetails(id);
      return NextResponse.json({ success: true, data });
    }

    if (body.action === "promote_dealer") {
      const result = await promoteMemberToDealer(id, admin.name);
      const { attachReferralOnRegistration } = await import("@/lib/partners/referral");
      await attachReferralOnRegistration(id, result.dealerId).catch(() => {});
      await logAdminAction(admin.id, admin.name, "member_promote_dealer", user.email, result.dealerId);
      const data = await getMemberWithDetails(id);
      return NextResponse.json({ success: true, data, dealerId: result.dealerId });
    }

    if (body.action === "suspend") {
      await prisma.user.update({
        where: { id },
        data: { status: "suspended", reviewedBy: admin.name },
      });
      const data = await getMemberWithDetails(id);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
