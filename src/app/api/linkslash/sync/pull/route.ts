import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { getSyncContext, resolveTenantScope } from "@/lib/linkslash/sync/context";
import { pullSync } from "@/lib/linkslash/sync/service";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    const access = await assertLinkSlashAccess(user);
    if (!access.allowed || !user) {
      return NextResponse.json({ success: false, error: access.reason }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenantId as string | undefined;
    const ctx = resolveTenantScope(getSyncContext(user), tenantId);
    const since = body.since ? new Date(body.since) : undefined;
    const data = await pullSync(ctx, since && !Number.isNaN(since.getTime()) ? since : undefined);

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Pull başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
