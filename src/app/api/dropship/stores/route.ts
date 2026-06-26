import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const DEALER_REQUIRED_MSG = "Mağaza oluşturmak için bayi seçilmelidir.";

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

    if (!dealerId || typeof dealerId !== "string" || !dealerId.trim()) {
      return NextResponse.json({ success: false, error: DEALER_REQUIRED_MSG }, { status: 400 });
    }

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "İsim ve slug gerekli" }, { status: 400 });
    }

    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId.trim() } });
    if (!dealer) {
      return NextResponse.json({ success: false, error: "Seçilen bayi bulunamadı" }, { status: 400 });
    }

    const existingDealerStore = await prisma.dealerStore.findUnique({ where: { dealerId: dealer.id } });
    if (existingDealerStore) {
      return NextResponse.json({ success: false, error: "Bu bayinin zaten bir mağazası var" }, { status: 400 });
    }

    const existingSlug = await prisma.dealerStore.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ success: false, error: "Bu slug zaten kullanılıyor" }, { status: 400 });
    }

    const store = await prisma.dealerStore.create({
      data: {
        name,
        slug,
        dealerId: dealer.id,
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
