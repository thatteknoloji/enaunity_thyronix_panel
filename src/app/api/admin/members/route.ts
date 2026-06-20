import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { computeMemberChecklist } from "@/lib/members/service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
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
      include: {
        memberDocuments: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = users.map((u) => {
      const checklist = computeMemberChecklist(u, u.memberDocuments);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        phone: u.phone,
        company: u.company,
        taxNumber: u.taxNumber,
        taxOffice: u.taxOffice,
        rejectionReason: u.rejectionReason,
        approvedAt: u.approvedAt,
        reviewedBy: u.reviewedBy,
        createdAt: u.createdAt,
        dealerId: u.dealerId,
        checklist,
        checklistComplete: checklist.every((c) => c.ok),
        _count: u._count,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
