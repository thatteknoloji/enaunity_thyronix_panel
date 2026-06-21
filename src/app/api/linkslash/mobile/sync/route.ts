import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { createLinkSlashCapture, type CaptureInput } from "@/lib/linkslash/capture-service";

/** Batch sync offline mobile queue items */
export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor", code: "AUTH_REQUIRED" }, { status: 401 });
    }

    const access = await assertLinkSlashAccess(user);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: access.reason, code: access.code || "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? (body.items as CaptureInput[]) : [];
    if (!items.length) {
      return NextResponse.json({ success: false, error: "items gerekli" }, { status: 400 });
    }

    const results: Array<{ queueId?: string; id: string; url: string }> = [];
    const errors: Array<{ queueId?: string; error: string }> = [];

    for (const item of items) {
      const queueId = (item as CaptureInput & { queueId?: string }).queueId;
      try {
        const capture = await createLinkSlashCapture(user.id, user.dealerId, { ...item, client: "mobile" });
        results.push({ queueId, id: capture.id, url: capture.url });
      } catch (e) {
        errors.push({ queueId, error: e instanceof Error ? e.message : "Sync hatası" });
      }
    }

    return NextResponse.json({
      success: true,
      data: { synced: results.length, failed: errors.length, results, errors },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
