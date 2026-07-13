import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireDealer } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/modules/access";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MODULE = "AI_DROPSHIP";

async function checkAccess(user: { dealerId?: string | null; role?: string | null }) {
  if (!user.dealerId) throw new Error("Bayi bulunamadı");
  const has = await hasModuleAccess(user.dealerId, MODULE, { userRole: user.role });
  if (!has) throw new Error("Bu modüle erişim yetkiniz yok");
}

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    await checkAccess(user);
    const store = await prisma.dealerStore.findUnique({ where: { dealerId: user.dealerId! } });
    if (!store) return NextResponse.json({ success: false, error: "Mağaza yok" }, { status: 404 });
    const media = await prisma.storeMedia.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: media });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Hata" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    await checkAccess(user);
    const store = await prisma.dealerStore.findUnique({ where: { dealerId: user.dealerId! } });
    if (!store) return NextResponse.json({ success: false, error: "Mağaza yok" }, { status: 404 });

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) return NextResponse.json({ success: false, error: "Dosya seçilmedi" }, { status: 400 });

    const uploadDir = path.join(process.cwd(), "public", "uploads", "stores", store.id);
    await mkdir(uploadDir, { recursive: true });

    const results = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split(".").pop() || "jpg";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = path.join(uploadDir, safeName);
      await writeFile(filePath, buffer);

      const url = `/uploads/stores/${store.id}/${safeName}`;
      const record = await prisma.storeMedia.create({
        data: {
          storeId: store.id,
          url,
          filename: file.name,
          mimetype: file.type || "image/jpeg",
          size: buffer.length,
        },
      });
      results.push(record);
    }
    return NextResponse.json({ success: true, data: results });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Hata" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    await checkAccess(user);
    const store = await prisma.dealerStore.findUnique({ where: { dealerId: user.dealerId! } });
    if (!store) return NextResponse.json({ success: false, error: "Mağaza yok" }, { status: 404 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID gerekli" }, { status: 400 });

    const media = await prisma.storeMedia.findFirst({ where: { id, storeId: store.id } });
    if (!media) return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });

    await prisma.storeMedia.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Hata" }, { status: 500 });
  }
}
