import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/modules/access";

const MODULE = "AI_DROPSHIP";

async function getStore(user: { dealerId?: string | null; role?: string | null }) {
  if (!user.dealerId) throw new Error("Bayi bulunamadı");
  const has = await hasModuleAccess(user.dealerId, MODULE, { userRole: user.role });
  if (!has) throw new Error("Yetkiniz yok");
  const store = await prisma.dealerStore.findUnique({ where: { dealerId: user.dealerId! } });
  if (!store) throw new Error("Mağaza bulunamadı");
  return store;
}

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    const store = await getStore(user);
    const banners = await prisma.storeBanner.findMany({
      where: { storeId: store.id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ success: true, data: banners });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Hata" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    const store = await getStore(user);
    const body = await req.json();

    const count = await prisma.storeBanner.count({ where: { storeId: store.id } });
    const banner = await prisma.storeBanner.create({
      data: {
        storeId: store.id,
        imageUrl: body.imageUrl || "",
        title: body.title || "",
        subtitle: body.subtitle || "",
        ctaText: body.ctaText || "",
        ctaLink: body.ctaLink || "",
        sortOrder: count,
        isActive: true,
      },
    });
    return NextResponse.json({ success: true, data: banner });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Hata" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    const store = await getStore(user);
    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });

    const existing = await prisma.storeBanner.findFirst({ where: { id, storeId: store.id } });
    if (!existing) return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });

    const allowed = ["imageUrl", "title", "subtitle", "ctaText", "ctaLink", "sortOrder", "isActive"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) data[key] = fields[key];
    }

    const updated = await prisma.storeBanner.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Hata" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    const store = await getStore(user);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });

    const existing = await prisma.storeBanner.findFirst({ where: { id, storeId: store.id } });
    if (!existing) return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });

    await prisma.storeBanner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Hata" }, { status: 500 });
  }
}
