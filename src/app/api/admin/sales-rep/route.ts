import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const assignments = await prisma.dealerAssignment.findMany({
      where: { adminId: user.id },
      select: {
        dealer: {
          include: { _count: { select: { orders: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const dealers = assignments.map(a => ({
      ...a.dealer,
      _count: a.dealer._count,
    }));

    return NextResponse.json({ success: true, data: dealers });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
