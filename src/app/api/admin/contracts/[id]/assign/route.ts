import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const assignments = await prisma.dealerContract.findMany({
      where: { contractId: id },
      include: { dealer: { select: { id: true, name: true, company: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: assignments });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { dealerIds } = await req.json();

    if (!Array.isArray(dealerIds) || dealerIds.length === 0) {
      return NextResponse.json({ success: false, error: "En az bir bayi seçin" }, { status: 400 });
    }

    const existing = await prisma.dealerContract.findMany({
      where: { contractId: id, dealerId: { in: dealerIds } },
      select: { dealerId: true },
    });
    const existingIds = new Set(existing.map((e) => e.dealerId));
    const newDealerIds = dealerIds.filter((did: string) => !existingIds.has(did));

    if (newDealerIds.length === 0) {
      return NextResponse.json({ success: false, error: "Seçilen bayiler zaten atanmış" }, { status: 409 });
    }

    await prisma.dealerContract.createMany({
      data: newDealerIds.map((dealerId: string) => ({
        dealerId,
        contractId: id,
        assignedBy: admin.name || admin.email,
      })),
    });

    return NextResponse.json({ success: true, assigned: newDealerIds.length });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { dealerId } = await req.json();
    await prisma.dealerContract.deleteMany({
      where: { contractId: id, dealerId },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
