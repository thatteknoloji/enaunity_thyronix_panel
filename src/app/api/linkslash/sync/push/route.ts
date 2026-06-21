import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { getSyncContext, resolveTenantScope } from "@/lib/linkslash/sync/context";
import { pushSync } from "@/lib/linkslash/sync/service";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    const access = await assertLinkSlashAccess(user);
    if (!access.allowed || !user) {
      return NextResponse.json({ success: false, error: access.reason }, { status: 403 });
    }

    const body = await req.json();
    const changes = Array.isArray(body?.changes) ? body.changes : [];
    const tenantId = body.tenantId as string | undefined;
    const ctx = resolveTenantScope(getSyncContext(user), tenantId);
    const data = await pushSync(ctx, changes);

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Push başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
