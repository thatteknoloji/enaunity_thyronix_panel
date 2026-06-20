import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, logAdminAction } from "@/lib/auth";
import { parseMemberChecklist } from "@/lib/members/checklist";

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const q = searchParams.get("q")?.trim();

    const users = await prisma.user.findMany({
      where: {
        role: { in: ["user", "dealer"] },
        ...(status && status !== "all" ? { status } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
                { company: { contains: q } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
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
      orderBy: { createdAt: "desc" },
    });

    const data = users.map((u) => ({
      ...u,
      checklist: parseMemberChecklist(u.approvalChecklistJson),
    }));

    void admin;
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
