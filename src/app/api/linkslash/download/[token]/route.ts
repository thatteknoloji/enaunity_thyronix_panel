import { NextResponse } from "next/server";
import { Readable } from "stream";
import { consumeDownloadToken } from "@/lib/linkslash/download-token";
import { createLinkSlashApkReadStream, getLinkSlashApkStat, LINKSLASH_APK_DOWNLOAD_FILENAME } from "@/lib/linkslash/apk-download";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const result = await consumeDownloadToken(token);
    if (!result.ok) {
      const messages = { NOT_FOUND: "Geçersiz indirme linki", USED: "Bu link zaten kullanıldı", EXPIRED: "İndirme linkinin süresi doldu" };
      return NextResponse.json(
        { success: false, error: messages[result.code], code: result.code },
        { status: result.code === "NOT_FOUND" ? 404 : 410 }
      );
    }

    const stat = await getLinkSlashApkStat(result.row.apkReleaseId || undefined);
    if (!stat) {
      return NextResponse.json({ success: false, error: "APK henüz hazır değil", code: "APK_MISSING" }, { status: 404 });
    }

    const stream = await createLinkSlashApkReadStream(result.row.apkReleaseId || undefined);
    if (!stream) {
      return NextResponse.json({ success: false, error: "APK okunamadı" }, { status: 500 });
    }

    console.info("[linkslash:download:token]", {
      userId: result.row.userId,
      dealerId: result.row.dealerId,
      token: token.slice(0, 8) + "…",
      size: stat.size,
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
