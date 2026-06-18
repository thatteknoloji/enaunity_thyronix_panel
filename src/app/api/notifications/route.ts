import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: user.dealerId
        ? { dealerId: user.dealerId }
        : { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });

    const { id, read, all } = await req.json();
    if (all) {
      const whereAll = user.dealerId ? { dealerId: user.dealerId } : { userId: user.id };
      await prisma.notification.updateMany({ where: whereAll, data: { read: true } });
    } else if (id) {
      const where = user.dealerId ? { id, dealerId: user.dealerId } : { id, userId: user.id };
      await prisma.notification.updateMany({ where, data: { read } });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });

    await prisma.notification.deleteMany({
      where: user.dealerId
        ? { id, dealerId: user.dealerId }
        : { id, userId: user.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
