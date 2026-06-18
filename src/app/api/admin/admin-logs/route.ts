import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "50");
    const action = searchParams.get("action") || "";
    const userId = searchParams.get("userId") || "";

    const where: any = {};
    if (action) where.action = { contains: action };
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.adminLog.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { items, total, page, size } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
