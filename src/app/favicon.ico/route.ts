import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings/service";
import { DEFAULT_FAVICON } from "@/lib/site-settings/defaults";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function GET() {
  const settings = await getSiteSettings();
  const url = (settings.faviconUrl || DEFAULT_FAVICON).split("?")[0];
  const rel = url.startsWith("/") ? url.slice(1) : url;
  const filePath = path.join(process.cwd(), "public", rel);

  try {
    const buf = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
