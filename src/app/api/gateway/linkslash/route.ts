import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveLinkSlashGatewayState } from "@/lib/linkslash/integration";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, code: "AUTH_REQUIRED", error: "Giriş gerekli" }, { status: 401 });
    }
    const data = await resolveLinkSlashGatewayState(user);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gateway hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
