import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { getSyncContext, resolveTenantScope } from "@/lib/linkslash/sync/context";
import { markSynced } from "@/lib/linkslash/sync/service";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    const access = await assertLinkSlashAccess(user);
    if (!access.allowed || !user) {
      return NextResponse.json({ success: false, error: access.reason }, { status: 403 });
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const tenantId = body.tenantId as string | undefined;
    const ctx = resolveTenantScope(getSyncContext(user), tenantId);
    const data = await markSynced(ctx, items);

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mark başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
