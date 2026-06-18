import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const dealers = await prisma.dealer.findMany({
      select: {
        id: true,
        company: true,
        name: true,
        group: true,
        paymentTerm: { select: { id: true, days: true, rate: true } },
      },
      orderBy: { company: "asc" },
    });
    return NextResponse.json({ success: true, data: dealers });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { dealerId, days, rate } = await req.json();

    const existing = await prisma.paymentTerm.findUnique({ where: { dealerId } });
    if (existing) {
      await prisma.paymentTerm.update({ where: { dealerId }, data: { days, rate } });
    } else {
      await prisma.paymentTerm.create({ data: { dealerId, days, rate } });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
