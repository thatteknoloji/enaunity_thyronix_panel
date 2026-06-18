import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user || !user.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

    const cart = await prisma.savedCart.findUnique({ where: { id } });
    if (!cart || cart.dealerId !== user.dealerId) {
      return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });
    }

    await prisma.savedCart.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
