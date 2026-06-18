import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireDealer();
    const docs = await prisma.dealerDocument.findMany({
      where: { dealerId: user.dealerId! },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: docs });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    const formData = await req.formData();
    const title = (formData.get("title") as string) || "";
    const type = (formData.get("type") as string) || "other";
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Dosya seçilmedi" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop() || "bin";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "documents", user.dealerId!);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), buffer);

    const doc = await prisma.dealerDocument.create({
      data: {
        dealerId: user.dealerId!,
        title: title || file.name,
        type,
        fileUrl: `/uploads/documents/${user.dealerId}/${safeName}`,
        fileName: file.name,
        fileSize: buffer.length,
      },
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Yükleme başarısız" }, { status: 500 });
  }
}
