import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { createDownloadToken } from "@/lib/linkslash/download-token";
import { getActiveApkRelease } from "@/lib/linkslash/apk-versions";

export async function POST() {
  try {
    const user = await getSession();
    const access = await assertLinkSlashAccess(user);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: access.reason, code: access.code },
        { status: access.code === "AUTH_REQUIRED" ? 401 : 403 }
      );
    }

    const active = await getActiveApkRelease();
    const token = await createDownloadToken({
      userId: user!.id,
      dealerId: user!.dealerId,
      apkReleaseId: active?.id,
    });

    return NextResponse.json({ success: true, data: token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Token oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
