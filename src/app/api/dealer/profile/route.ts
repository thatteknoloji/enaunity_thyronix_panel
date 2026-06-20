import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDealerSubscriptionSummaries } from "@/lib/modules/subscription-lifecycle-worker";

export async function GET() {
  try {
    const user = await getSession();
    if (!user || !user.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { id: user.dealerId },
      include: { dealerGroup: true },
    });

    if (!dealer) {
      return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });
    }

    const subscriptions = await getDealerSubscriptionSummaries(user.dealerId);

    return NextResponse.json({ success: true, data: { ...dealer, subscriptions } });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSession();
    if (!user || !user.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { taxNumber, taxOffice, billingAddress, shippingAddress, phone, website, location, logo } = await req.json();
    const update: Record<string, unknown> = {};
    if (taxNumber !== undefined) update.taxNumber = taxNumber;
    if (taxOffice !== undefined) update.taxOffice = taxOffice;
    if (billingAddress !== undefined) update.billingAddress = billingAddress;
    if (shippingAddress !== undefined) update.shippingAddress = shippingAddress;
    if (phone !== undefined) update.phone = phone;
    if (website !== undefined) update.website = website;
    if (location !== undefined) update.location = location;
    if (logo !== undefined) update.logo = logo;

    const dealer = await prisma.dealer.update({
      where: { id: user.dealerId },
      data: update as any,
    });

    return NextResponse.json({ success: true, data: dealer });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
