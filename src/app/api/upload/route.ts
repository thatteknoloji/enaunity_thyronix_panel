import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) return NextResponse.json({ success: false, error: "Dosya seçilmedi" }, { status: 400 });

    const uploadDir = path.join(process.cwd(), "public", "uploads", user.id);
    await mkdir(uploadDir, { recursive: true });

    const results = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split(".").pop() || "bin";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = path.join(uploadDir, safeName);

      await writeFile(filePath, buffer);

      results.push({
        fileName: file.name,
        fileUrl: `/uploads/${user.id}/${safeName}`,
        fileType: file.type.startsWith("image/") ? "image" : "pdf",
        fileSize: buffer.length,
      });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (e: any) {
    console.error("[Upload]", e);
    return NextResponse.json({ success: false, error: "Yükleme başarısız" }, { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
