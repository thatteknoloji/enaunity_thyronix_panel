import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const groups = await prisma.dealerGroup.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { dealers: true } } },
    });
    return NextResponse.json({ success: true, data: groups });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { name, discountRate, creditLimit, allowNegativeBalance, minOrderAmount, paymentDays, rules } = await req.json();
    const group = await prisma.dealerGroup.create({
      data: {
        name,
        discountRate: discountRate || 0,
        creditLimit: creditLimit || 0,
        allowNegativeBalance: allowNegativeBalance || false,
        minOrderAmount: minOrderAmount || 0,
        paymentDays: paymentDays || 0,
        rules: rules ? JSON.stringify(rules) : "{}",
      },
    });
    return NextResponse.json({ success: true, data: group });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, ...data } = await req.json();
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.discountRate !== undefined) update.discountRate = data.discountRate;
    if (data.creditLimit !== undefined) update.creditLimit = data.creditLimit;
    if (data.allowNegativeBalance !== undefined) update.allowNegativeBalance = data.allowNegativeBalance;
    if (data.minOrderAmount !== undefined) update.minOrderAmount = data.minOrderAmount;
    if (data.paymentDays !== undefined) update.paymentDays = data.paymentDays;
    if (data.rules !== undefined) update.rules = JSON.stringify(data.rules);

    await prisma.dealerGroup.update({ where: { id }, data: update as any });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    await prisma.dealerGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
