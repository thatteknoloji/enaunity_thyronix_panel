import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const { status, note } = await req.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, error: "Geçersiz durum" }, { status: 400 });
    }

    const dc = await prisma.dealerContract.findFirst({
      where: { id, dealerId: user.dealerId! },
    });
    if (!dc) {
      return NextResponse.json({ success: false, error: "Sözleşme bulunamadı" }, { status: 404 });
    }

    await prisma.dealerContract.update({
      where: { id },
      data: { status, respondedAt: new Date(), note: note || "" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
