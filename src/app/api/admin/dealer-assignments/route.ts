import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const assignments = await prisma.dealerAssignment.findMany({
      include: { dealer: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { adminId, adminName, dealerId } = await req.json();

    const existing = await prisma.dealerAssignment.findUnique({
      where: { adminId_dealerId: { adminId, dealerId } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu atama zaten mevcut" }, { status: 400 });
    }

    const assignment = await prisma.dealerAssignment.create({
      data: { adminId, adminName: adminName || "", dealerId },
      include: { dealer: true },
    });

    return NextResponse.json({ success: true, data: assignment });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { adminId, dealerId } = await req.json();
    await prisma.dealerAssignment.delete({
      where: { adminId_dealerId: { adminId, dealerId } },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
