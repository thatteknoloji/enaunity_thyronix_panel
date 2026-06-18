import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { code, cartTotal } = await req.json();

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon) {
      return NextResponse.json({ success: false, error: "Geçersiz kupon kodu" }, { status: 400 });
    }

    if (!coupon.active) {
      return NextResponse.json({ success: false, error: "Kupon kodu aktif değil" }, { status: 400 });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json({ success: false, error: "Kupon kodunun süresi dolmuş" }, { status: 400 });
    }

    if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ success: false, error: "Kupon kodu kullanım limiti dolmuş" }, { status: 400 });
    }

    if (cartTotal < coupon.minAmount) {
      return NextResponse.json({
        success: false,
        error: `Minimum sepet tutarı ${coupon.minAmount.toFixed(2)} TL (şu an: ${cartTotal.toFixed(2)} TL)`,
      }, { status: 400 });
    }

    let discount = coupon.type === "percentage"
      ? (cartTotal * coupon.value) / 100
      : coupon.value;

    if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    if (discount > cartTotal) discount = cartTotal;

    return NextResponse.json({
      success: true,
      data: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
