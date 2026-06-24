import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const stores = await prisma.dealerStore.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { products: true, orders: true } },
      },
    });
    return NextResponse.json({ success: true, data: stores });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { name, slug, dealerId, paymentModel } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "İsim ve slug gerekli" }, { status: 400 });
    }

    const existingSlug = await prisma.dealerStore.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ success: false, error: "Bu slug zaten kullanılıyor" }, { status: 400 });
    }

    const store = await prisma.dealerStore.create({
      data: {
        name,
        slug,
        dealerId: dealerId || `admin-${Date.now()}`,
        status: "ACTIVE",
        paymentModel: paymentModel || "PLATFORM",
      },
    });

    return NextResponse.json({ success: true, data: store });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
