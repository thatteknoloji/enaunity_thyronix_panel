import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user?.dealerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favoriteProduct.findMany({
      where: { dealerId: user.dealerId },
      include: {
        product: {
          select: { id: true, name: true, price: true, image: true, category: true, stock: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: favorites });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch favorites" }, { status: 500 });
  }
}
