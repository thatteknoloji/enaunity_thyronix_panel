import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import {
  createLinkSlashApkReadStream,
  getLinkSlashApkStat,
  LINKSLASH_APK_DOWNLOAD_FILENAME,
} from "@/lib/linkslash/apk-download";

export async function GET() {
  try {
    const user = await getSession();
    const access = await assertLinkSlashAccess(user);
    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: access.reason || "LinkSlash lisansı gerekli",
          code: access.code || "LISANS_YOK",
          redirect: access.code === "AUTH_REQUIRED" ? "/gateway/linkslash" : "/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter",
        },
        { status: access.code === "AUTH_REQUIRED" ? 401 : 403 }
      );
    }

    const stat = getLinkSlashApkStat();
    if (!stat) {
      return NextResponse.json(
        { success: false, error: "Android APK henüz hazır değil", code: "APK_MISSING" },
        { status: 404 }
      );
    }

    const stream = createLinkSlashApkReadStream();
    if (!stream) {
      return NextResponse.json({ success: false, error: "APK okunamadı" }, { status: 500 });
    }

    console.info("[linkslash:download:android]", {
      userId: user?.id,
      dealerId: user?.dealerId ?? null,
      moduleKey: "LINKSLASH",
      fileType: "apk",
      size: stat.size,
      downloadedAt: new Date().toISOString(),
    });

    const webStream = Readable.toWeb(stream) as ReadableStream;
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${LINKSLASH_APK_DOWNLOAD_FILENAME}"`,
        "Content-Length": String(stat.size),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İndirme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
