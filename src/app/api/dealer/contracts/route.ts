import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireDealer();
    const contracts = await prisma.dealerContract.findMany({
      where: { dealerId: user.dealerId! },
      include: {
        contract: { select: { id: true, title: true, slug: true, content: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: contracts });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
