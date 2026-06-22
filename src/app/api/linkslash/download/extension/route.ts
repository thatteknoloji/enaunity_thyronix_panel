import { createReadStream, existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
const EXTENSION_ZIP_FS = path.join(process.cwd(), "public/downloads/linkslash/linkslash-extension.zip");

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
          redirect:
            access.code === "AUTH_REQUIRED"
              ? "/gateway/linkslash"
              : "/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter",
        },
        { status: access.code === "AUTH_REQUIRED" ? 401 : 403 }
      );
    }

    if (!existsSync(EXTENSION_ZIP_FS)) {
      return NextResponse.json({ success: false, error: "Extension paketi henüz hazır değil" }, { status: 404 });
    }

    const stream = createReadStream(EXTENSION_ZIP_FS);
    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="linkslash-extension.zip"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İndirme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
