import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const user = await getSession();
    if (!user?.dealerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await params;

    const existing = await prisma.favoriteProduct.findUnique({
      where: { dealerId_productId: { dealerId: user.dealerId, productId } },
    });

    if (existing) {
      await prisma.favoriteProduct.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, data: null, action: "removed" });
    }

    const fav = await prisma.favoriteProduct.create({
      data: { dealerId: user.dealerId, productId },
    });

    return NextResponse.json({ success: true, data: fav, action: "added" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to toggle favorite" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const user = await getSession();
    if (!user?.dealerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await params;

    await prisma.favoriteProduct.deleteMany({
      where: { dealerId: user.dealerId, productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to remove favorite" }, { status: 500 });
  }
}
