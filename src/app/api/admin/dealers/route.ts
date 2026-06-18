import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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
    const { name, title, email, phone, company, website, location, companySize, markets, discountRate, creditLimit, group, openingBalance } = body;

    if (!name || !email || !company) {
      return NextResponse.json({ success: false, error: "İsim, e-posta ve şirket zorunludur" }, { status: 400 });
    }

    const existing = await prisma.dealer.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu e-posta ile kayıtlı bayi var" }, { status: 409 });
    }

    const dealer = await prisma.dealer.create({
      data: { name, title: title || "", email, phone: phone || "", company, website: website || "", location: location || "", companySize: companySize || "", markets: markets || "", discountRate: discountRate || 0, creditLimit: creditLimit || 0, group: group || "bronze", openingBalance: openingBalance || 0 },
    });

    return NextResponse.json({ success: true, data: dealer }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
