import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveThyronixGatewayState } from "@/lib/thyronix/integration";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Oturum bulunamadı", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const state = await resolveThyronixGatewayState(user);
  return NextResponse.json({ success: true, data: state });
}
