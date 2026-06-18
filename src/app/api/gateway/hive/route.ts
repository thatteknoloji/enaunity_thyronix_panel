import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveHiveGatewayState } from "@/lib/hive/integration";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Oturum bulunamadı", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const state = await resolveHiveGatewayState(user);
  return NextResponse.json({ success: true, data: state });
}
