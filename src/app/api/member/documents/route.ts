import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MEMBER_DOCUMENT_LABELS } from "@/lib/members/checklist";
import { MEMBER_REQUIRED_DOCUMENTS } from "@/lib/members/checklist";
import { syncMemberChecklistSnapshot } from "@/lib/members/service";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

  const docs = await prisma.memberDocument.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: docs });
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });
    if (user.role === "admin") {
      return NextResponse.json({ success: false, error: "Admin hesabı ile evrak yüklenemez" }, { status: 400 });
    }

    const formData = await req.formData();
    const type = String(formData.get("type") || "");
    const file = formData.get("file") as File | null;

    if (!MEMBER_REQUIRED_DOCUMENTS.includes(type as (typeof MEMBER_REQUIRED_DOCUMENTS)[number])) {
      return NextResponse.json({ success: false, error: "Geçersiz evrak türü" }, { status: 400 });
    }
    const docType = type as (typeof MEMBER_REQUIRED_DOCUMENTS)[number];
    if (!file) return NextResponse.json({ success: false, error: "Dosya seçilmedi" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop() || "bin";
    const safeName = `${type}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "member-documents", user.id);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), buffer);

    await prisma.memberDocument.deleteMany({ where: { userId: user.id, type: docType } });

    const doc = await prisma.memberDocument.create({
      data: {
        userId: user.id,
        type: docType,
        title: MEMBER_DOCUMENT_LABELS[docType],
        fileUrl: `/uploads/member-documents/${user.id}/${safeName}`,
        fileName: file.name,
        fileSize: buffer.length,
        status: "pending",
      },
    });

    await syncMemberChecklistSnapshot(user.id);
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Yükleme başarısız" }, { status: 500 });
  }
}
