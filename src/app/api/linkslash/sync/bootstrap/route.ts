import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { getSyncContext, resolveTenantScope } from "@/lib/linkslash/sync/context";
import { bootstrapSync } from "@/lib/linkslash/sync/service";

export async function GET(req: Request) {
  try {
    const user = await getSession();
    const access = await assertLinkSlashAccess(user);
    if (!access.allowed || !user) {
      return NextResponse.json({ success: false, error: access.reason }, { status: 403 });
    }

    const tenantId = new URL(req.url).searchParams.get("tenantId");
    const ctx = resolveTenantScope(getSyncContext(user), tenantId);
    const data = await bootstrapSync(ctx);

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bootstrap başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
