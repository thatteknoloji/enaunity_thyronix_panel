import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireSuperAdmin } from "@/lib/auth";
import { assertImageUploadSize, optimizeContentImage } from "@/lib/images/optimize-upload";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
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

    assertImageUploadSize(file.size);

    const subdir =
      kind === "hero" ? "homepage/hero" : kind === "content" ? "content" : "homepage";
    const uploadDir = path.join(process.cwd(), "public", "uploads", subdir);
    await mkdir(uploadDir, { recursive: true });

    const bytes = Buffer.from(await file.arrayBuffer());

    if (isVideo) {
      const maxVideo = 25 * 1024 * 1024;
      if (file.size > maxVideo) {
        return NextResponse.json({ success: false, error: "Video en fazla 25 MB olmalı" }, { status: 400 });
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await writeFile(path.join(uploadDir, safeName), bytes);
      return NextResponse.json({
        success: true,
        data: { url: `/uploads/${subdir}/${safeName}`, name: file.name, size: file.size, type: file.type },
      });
    }

    if (file.type === "image/svg+xml") {
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.svg`;
      await writeFile(path.join(uploadDir, safeName), bytes);
      return NextResponse.json({
        success: true,
        data: { url: `/uploads/${subdir}/${safeName}`, name: file.name, size: bytes.length, type: file.type },
      });
    }

    const optimized = await optimizeContentImage(bytes, file.name);
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${optimized.ext}`;
    await writeFile(path.join(uploadDir, safeName), optimized.buffer);

    return NextResponse.json({
      success: true,
      data: {
        url: `/uploads/${subdir}/${safeName}`,
        name: file.name,
        size: optimized.buffer.length,
        type: optimized.mime,
        width: optimized.width,
        height: optimized.height,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yükleme hatası";
    console.error("[Homepage Upload]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
