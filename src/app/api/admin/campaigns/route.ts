import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const campaigns = await prisma.campaign.findMany({
      include: { products: { include: { product: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: campaigns });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { buyProducts, getProducts, ...data } = await req.json();

    const campaign = await prisma.campaign.create({
      data: {
        ...data,
        products: {
          create: [
            ...(buyProducts || []).map((productId: string) => ({ type: "buy", productId, quantity: 1 })),
            ...(getProducts || []).map((productId: string) => ({ type: "get", productId, quantity: 1 })),
          ],
        },
      },
    });
    return NextResponse.json({ success: true, data: campaign });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
