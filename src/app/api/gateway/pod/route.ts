import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolvePodGatewayState } from "@/lib/pod/access";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "Oturum bulunamadı", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const state = await resolvePodGatewayState(user);
  return NextResponse.json({ success: true, data: state });
}
