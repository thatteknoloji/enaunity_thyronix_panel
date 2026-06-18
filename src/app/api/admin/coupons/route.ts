import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: coupons });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const coupon = await prisma.coupon.create({
      data: {
        code: body.code.toUpperCase().replace(/\s/g, ""),
        type: body.type,
        value: parseFloat(body.value),
        minAmount: parseFloat(body.minAmount || "0"),
        maxDiscount: parseFloat(body.maxDiscount || "0"),
        usageLimit: parseInt(body.usageLimit || "0"),
        active: body.active !== false,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
    return NextResponse.json({ success: true, data: coupon }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, ...data } = await req.json();
    const coupon = await prisma.coupon.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: coupon });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
