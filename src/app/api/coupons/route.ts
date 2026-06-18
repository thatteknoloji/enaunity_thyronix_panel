import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });

    const coupons = await prisma.coupon.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: coupons.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        discount: c.type === "percentage" ? c.value : null,
        value: c.value,
        description: c.type === "percentage" ? `%${c.value} indirim` : `${c.value}₺ indirim`,
        minAmount: c.minAmount,
        expiresAt: c.expiresAt,
      })),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
