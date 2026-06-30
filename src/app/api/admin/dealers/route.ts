import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizeDealerAdminInput } from "@/lib/admin/dealer-admin-input";

export async function GET() {
  try {
    await requireAdmin();
    const dealers = await prisma.dealer.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    });
    return NextResponse.json({ success: true, data: dealers });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = normalizeDealerAdminInput(body, { requireCoreFields: true }) as Prisma.DealerCreateInput;

    const existing = await prisma.dealer.findUnique({ where: { email: String(data.email) } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu e-posta ile kayıtlı bayi var" }, { status: 409 });
    }

    const dealer = await prisma.dealer.create({
      data,
    });

    return NextResponse.json({ success: true, data: dealer }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "İsim, e-posta ve şirket zorunludur") {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
