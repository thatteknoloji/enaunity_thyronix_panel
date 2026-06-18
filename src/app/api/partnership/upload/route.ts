import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ success: false, error: "Dosya gerekli" }, { status: 400 });

    const ext = file.name.split(".").pop() || "pdf";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "partnership");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(path.join(uploadDir, safeName), Buffer.from(bytes));

    return NextResponse.json({ success: true, data: { url: `/uploads/partnership/${safeName}`, name: file.name } });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ success: false, error: "Yükleme hatası" }, { status: 500 });
  }
}
