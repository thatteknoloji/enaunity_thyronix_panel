import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

import { getAdminReacceptanceReport } from "@/lib/legal/reacceptance";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type") || "acceptances";

    if (type === "reacceptance") {
      const data = await getAdminReacceptanceReport();
      return NextResponse.json({ success: true, data });
    }

    if (type === "audit") {
      const logs = await prisma.legalAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return NextResponse.json({ success: true, data: logs });
    }

    if (type === "emails") {
      const emails = await prisma.legalEmailLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return NextResponse.json({ success: true, data: emails });
    }

    const acceptances = await prisma.legalAcceptance.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q } },
              { contractSlug: { contains: q } },
              { contractTitle: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { acceptedAt: "desc" },
      take: 300,
    });

    const contracts = await prisma.contract.findMany({
      include: { versions: { orderBy: { version: "desc" }, take: 3 } },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ success: true, data: { acceptances, contracts } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
