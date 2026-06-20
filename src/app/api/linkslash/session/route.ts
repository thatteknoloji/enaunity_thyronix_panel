import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        linkslashAccess: false,
        loginUrl: "/auth/login",
        gatewayUrl: "/gateway/linkslash",
      });
    }

    const access = await assertLinkSlashAccess(user);
    return NextResponse.json({
      success: true,
      authenticated: true,
      linkslashAccess: access.allowed,
      accessCode: access.code || null,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        dealerId: user.dealerId || null,
      },
      loginUrl: "/auth/login",
      gatewayUrl: "/gateway/linkslash",
      appUrl: "/dealer/linkslash",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Oturum kontrolü başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
