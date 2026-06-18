import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.minAmount !== undefined) update.minAmount = body.minAmount;
    if (body.maxAmount !== undefined) update.maxAmount = body.maxAmount;
    if (body.categories !== undefined) update.categories = JSON.stringify(body.categories);
    if (body.dealerGroups !== undefined) update.dealerGroups = JSON.stringify(body.dealerGroups);
    if (body.minItemCount !== undefined) update.minItemCount = body.minItemCount;
    if (body.active !== undefined) update.active = body.active;

    const rule = await prisma.approvalRule.update({
      where: { id },
      data: update as any,
    });

    return NextResponse.json({ success: true, data: rule });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.approvalRule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
