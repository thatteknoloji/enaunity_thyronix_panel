import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireDealer } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }
    const dealerId = user.dealerId;
    if (!dealerId) {
      return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });
    }
    let store = await prisma.dealerStore.findUnique({
      where: { dealerId },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    return NextResponse.json({ success: true, data: store });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;
    const body = await req.json();

    const existing = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Zaten bir mağazanız var" }, { status: 400 });
    }

    const slug = (body.slug || dealerId).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const store = await prisma.dealerStore.create({
      data: {
        dealerId,
        name: body.name || "Mağazam",
        slug,
        aboutText: body.aboutText || "",
        contactEmail: body.contactEmail || "",
        contactPhone: body.contactPhone || "",
        logo: body.logo || "",
        coverImage: body.coverImage || "",
        status: "DRAFT",
      },
    });
    return NextResponse.json({ success: true, data: store });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireDealer();
    const dealerId = user.dealerId!;
    const body = await req.json();

    const store = await prisma.dealerStore.findUnique({ where: { dealerId } });
    if (!store) {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const allowedFields = [
      "name", "logo", "coverImage", "aboutText",
      "contactEmail", "contactPhone", "themeJson", "status",
    ];
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    if (body.slug && body.slug !== store.slug) {
      data.slug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    }

    const updated = await prisma.dealerStore.update({ where: { id: store.id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
