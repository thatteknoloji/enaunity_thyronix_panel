import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const user = await requireDealer();
    const subUsers = await prisma.subUser.findMany({
      where: { dealerId: user.dealerId! },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: subUsers });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    const body = await req.json();
    const hashed = await bcrypt.hash(body.password, 10);
    const subUser = await prisma.subUser.create({
      data: {
        dealerId: user.dealerId!,
        name: body.name,
        email: body.email,
        password: hashed,
        role: body.role || "orderer",
      },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json({ success: true, data: subUser }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ success: false, error: "Bu e-posta adresi zaten kullanılıyor" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireDealer();
    const { id, ...data } = await req.json();
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);
    const subUser = await prisma.subUser.update({
      where: { id, dealerId: user.dealerId! },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json({ success: true, data: subUser });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireDealer();
    const { id } = await req.json();
    await prisma.subUser.delete({ where: { id, dealerId: user.dealerId! } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
