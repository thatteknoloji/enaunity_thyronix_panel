import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { analyzeLinkContent } from "@/lib/linkslash/ai-analyze";
import { getSyncContext } from "@/lib/linkslash/sync/context";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const access = await assertLinkSlashAccess(user);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: access.reason, code: access.code || "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const ctx = getSyncContext(user);

    const result = await analyzeLinkContent({
      linkId: body.linkId,
      url: body.url,
      title: body.title,
      description: body.description,
      rawText: body.rawText,
      sourceType: body.sourceType,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      save: body.save !== false,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI analiz başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
