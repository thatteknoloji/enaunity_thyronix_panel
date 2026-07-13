import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/auth";

const MAX_BYTES = 1024 * 1024;
const ALLOWED_EXT = new Set(["ico", "png", "svg", "webp"]);
const MIME_MAP: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

function resolveExt(file: File): string | null {
  const fromMime = MIME_MAP[file.type];
  if (fromMime) return fromMime;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && ALLOWED_EXT.has(ext)) return ext;
  return null;
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = (formData.get("kind") as string) || "favicon";

    if (!file) {
      return NextResponse.json({ success: false, error: "Dosya gerekli" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: "Dosya en fazla 1 MB olmalı" }, { status: 400 });
    }

    const ext = resolveExt(file);
    if (!ext) {
      return NextResponse.json(
        { success: false, error: "Yalnızca .ico, .png, .svg veya .webp yüklenebilir" },
        { status: 400 }
      );
    }

    if (kind === "favicon" && ext === "webp") {
      // webp favicon is fine
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "site");
    await mkdir(uploadDir, { recursive: true });

    const prefix = kind === "og" || kind === "apple" ? "og" : "favicon";
    const safeName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, safeName), bytes);

    return NextResponse.json({
      success: true,
      data: {
        url: `/uploads/site/${safeName}`,
        name: file.name,
        size: bytes.length,
        type: file.type || ext,
      },
    });
  } catch (e) {
    console.error("[Site Settings Upload]", e);
    return NextResponse.json({ success: false, error: "Yükleme hatası" }, { status: 500 });
  }
}
