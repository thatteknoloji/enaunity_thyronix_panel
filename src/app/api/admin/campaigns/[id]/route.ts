import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { buyProducts, getProducts, ...data } = await req.json();

    // Delete old products and recreate
    await prisma.campaignProduct.deleteMany({ where: { campaignId: id } });

    const productCreates = [
      ...(buyProducts || []).map((productId: string) => ({ type: "buy", productId, quantity: 1 })),
      ...(getProducts || []).map((productId: string) => ({ type: "get", productId, quantity: 1 })),
    ];

    await prisma.campaign.update({
      where: { id },
      data: { ...data, products: productCreates.length > 0 ? { create: productCreates } : undefined },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
