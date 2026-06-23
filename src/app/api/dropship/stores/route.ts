import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const stores = await prisma.dealerStore.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        products: true,
        orders: { take: 5, orderBy: { createdAt: "desc" } },
      },
    });
    return NextResponse.json({ success: true, data: stores });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
