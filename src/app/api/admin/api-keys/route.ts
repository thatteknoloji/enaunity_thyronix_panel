import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  try {
    await requireAdmin();
    const keys = await prisma.apiKey.findMany({
      include: { dealer: { select: { id: true, company: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: keys });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { dealerId, name, rateLimit } = await req.json();
    const key = `ena_${crypto.randomBytes(24).toString("hex")}`;
    const k = await prisma.apiKey.create({
      data: { dealerId: dealerId || null, name: name || "", key, rateLimit: rateLimit || 60 },
    });
    return NextResponse.json({ success: true, data: k });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, active, rateLimit } = await req.json();
    const update: Record<string, unknown> = {};
    if (active !== undefined) update.active = active;
    if (rateLimit !== undefined) update.rateLimit = rateLimit;
    await prisma.apiKey.update({ where: { id }, data: update as any });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    await prisma.apiKey.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
