import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const rules = await prisma.approvalRule.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: rules });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { name, minAmount, maxAmount, categories, dealerGroups, minItemCount } = await req.json();

    const rule = await prisma.approvalRule.create({
      data: {
        name,
        minAmount: minAmount || 0,
        maxAmount: maxAmount || 0,
        categories: JSON.stringify(categories || []),
        dealerGroups: JSON.stringify(dealerGroups || []),
        minItemCount: minItemCount || 0,
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
