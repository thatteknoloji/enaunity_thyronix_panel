import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/auth";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = (formData.get("kind") as string) || "banner";

    if (!file) {
      return NextResponse.json({ success: false, error: "Dosya gerekli" }, { status: 400 });
    }

    const isVideo = VIDEO_TYPES.has(file.type);
    const isImage = IMAGE_TYPES.has(file.type);

    if (!isVideo && !isImage) {
      return NextResponse.json({ success: false, error: "JPG, PNG, WebP, GIF, SVG veya MP4/WebM" }, { status: 400 });
    }

    const maxSize = isVideo ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: isVideo ? "Video en fazla 25 MB olmalı" : "Görsel en fazla 8 MB olmalı",
      }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const subdir = kind === "hero" ? "homepage/hero" : "homepage";
    const uploadDir = path.join(process.cwd(), "public", "uploads", subdir);
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(path.join(uploadDir, safeName), Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      data: {
        url: `/uploads/${subdir}/${safeName}`,
        name: file.name,
        size: file.size,
        type: file.type,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yükleme hatası" }, { status: 500 });
  }
}
