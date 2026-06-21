import { NextResponse } from "next/server";
import { getLinkSlashDownloadStatus } from "@/lib/linkslash/download-status";

export async function GET() {
  try {
    const data = getLinkSlashDownloadStatus(false);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[LinkSlash downloads status]", e);
    return NextResponse.json({ success: false, error: "Durum alınamadı" }, { status: 500 });
  }
}
