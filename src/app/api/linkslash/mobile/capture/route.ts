import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { createLinkSlashCapture, type CaptureInput } from "@/lib/linkslash/capture-service";

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

    const body = (await req.json()) as CaptureInput & { items?: CaptureInput[] };

    if (Array.isArray(body.items) && body.items.length > 0) {
      const results = [];
      const errors: Array<{ index: number; error: string }> = [];
      for (let i = 0; i < body.items.length; i++) {
        try {
          const item = { ...body.items[i], client: "mobile" as const };
          if (!item.url && !item.rawText) throw new Error("url veya rawText gerekli");
          const capture = await createLinkSlashCapture(user.id, user.dealerId, item);
          results.push({
            id: capture.id,
            url: capture.url,
            title: capture.title,
            sourceType: capture.sourceType,
          });
        } catch (e) {
          errors.push({ index: i, error: e instanceof Error ? e.message : "Kayıt başarısız" });
        }
      }
      return NextResponse.json({ success: true, data: { synced: results.length, results, errors } });
    }

    const payload: CaptureInput = { ...body, client: "mobile" };
    if (!payload.url && !payload.rawText) {
      return NextResponse.json({ success: false, error: "url veya rawText gerekli" }, { status: 400 });
    }

    const capture = await createLinkSlashCapture(user.id, user.dealerId, payload);

    return NextResponse.json({
      success: true,
      data: {
        id: capture.id,
        url: capture.url,
        title: capture.title,
        description: capture.description,
        image: capture.image,
        favicon: capture.favicon,
        domain: capture.domain,
        sourceType: capture.sourceType,
        tags: JSON.parse(capture.tagsJson || "[]"),
        aiCategory: capture.aiCategory,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kayıt başarısız";
    const status = msg.includes("URL") ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
