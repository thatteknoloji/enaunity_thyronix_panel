import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const store = await prisma.dealerStore.findUnique({
      where: { id },
      include: {
        products: { orderBy: { sortOrder: "asc" } },
        orders: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: store });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const allowedFields = [
      "name", "slug", "customDomain", "customDomainVerified",
      "logo", "coverImage", "aboutText", "contactEmail", "contactPhone",
      "themeJson", "paymentModel", "status",
    ];
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    const store = await prisma.dealerStore.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: store });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
