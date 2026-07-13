import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { createDownloadToken } from "@/lib/linkslash/download-token";
import { getActiveApkRelease } from "@/lib/linkslash/apk-versions";

/** Doğrudan indirme kapalı — önce token alınmalı */
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

    const active = await getActiveApkRelease();
    const token = await createDownloadToken({
      userId: user!.id,
      dealerId: user!.dealerId,
      apkReleaseId: active?.id,
    });

    return NextResponse.redirect(new URL(token.downloadUrl, process.env.NEXT_PUBLIC_APP_URL || "https://enaunity.com.tr"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İndirme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
