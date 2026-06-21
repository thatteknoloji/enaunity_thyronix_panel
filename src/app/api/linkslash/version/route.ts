import { NextResponse } from "next/server";
import { getVersionInfo } from "@/lib/linkslash/apk-versions";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const current = url.searchParams.get("current") || undefined;
    const info = await getVersionInfo(current);
    return NextResponse.json({
      success: true,
      latest: info.latest,
      required: info.required,
      buildNumber: info.buildNumber,
      apkUrl: info.apkUrl,
      tokenUrl: info.tokenUrl,
      updateAvailable: info.updateAvailable,
      updateRequired: info.updateRequired,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sürüm bilgisi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
