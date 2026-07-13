import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { ackCaptures } from "@/lib/linkslash/capture-service";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const access = await assertLinkSlashAccess(user);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: access.reason }, { status: 403 });
    }

    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
    const count = await ackCaptures(user.id, ids);

    return NextResponse.json({ success: true, synced: count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Senkronizasyon başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
