import { NextResponse } from "next/server";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/lib/thyronix/workspace";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const data = await getWorkspaceSettings(user);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    await updateWorkspaceSettings(user, body);
    const data = await getWorkspaceSettings(user);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
