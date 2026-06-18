import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const catalogId = url.searchParams.get("catalogId") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));

    const where: Record<string, unknown> = {};
    if (catalogId) where.catalogId = catalogId;
    if (status) where.status = status;

    const jobs = await prisma.productImportJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: jobs });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
