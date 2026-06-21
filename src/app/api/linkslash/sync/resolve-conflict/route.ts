import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { getSyncContext, resolveTenantScope } from "@/lib/linkslash/sync/context";
import { resolveConflict } from "@/lib/linkslash/sync/service";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    const access = await assertLinkSlashAccess(user);
    if (!access.allowed || !user) {
      return NextResponse.json({ success: false, error: access.reason }, { status: 403 });
    }

    const body = await req.json();
    const tenantId = body.tenantId as string | undefined;
    const ctx = resolveTenantScope(getSyncContext(user), tenantId);
    const link = await resolveConflict(ctx, {
      entityType: body.entityType || "link",
      cloudId: body.cloudId,
      localId: body.localId,
      winner: body.winner === "client" ? "client" : "server",
      data: body.data,
    });

    return NextResponse.json({ success: true, data: { link } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Conflict çözümü başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
