import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireDealer();
    const addresses = await prisma.address.findMany({
      where: { dealerId: user.dealerId! },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ success: true, data: addresses });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    const body = await req.json();
    const { label, type, fullAddress, city, district, zipCode, phone, isDefault } = body;

    if (!fullAddress || !city) {
      return NextResponse.json({ success: false, error: "Adres ve şehir zorunludur" }, { status: 400 });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { dealerId: user.dealerId!, type: type || "shipping", isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        dealerId: user.dealerId!,
        label: label || "",
        type: type || "shipping",
        fullAddress,
        city,
        district: district || "",
        zipCode: zipCode || "",
        phone: phone || "",
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({ success: true, data: address }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
