import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { countActiveDevices, getMaxDevicesForUser, isDeviceAllowed } from "@/lib/linkslash/devices";
import { getVersionInfo, LINKSLASH_MOBILE_APP_VERSION } from "@/lib/linkslash/apk-versions";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const deviceId = url.searchParams.get("deviceId") || "";
    const appVersion = url.searchParams.get("appVersion") || LINKSLASH_MOBILE_APP_VERSION;

    const user = await getSession();
    if (!user) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        linkslashAccess: false,
        gatewayUrl: "/gateway/linkslash",
        version: await getVersionInfo(appVersion),
      });
    }

    const access = await assertLinkSlashAccess(user);
    const version = await getVersionInfo(appVersion);
    let deviceBound = false;
    let deviceError: string | null = null;

    if (access.allowed && deviceId) {
      deviceBound = await isDeviceAllowed(user.id, deviceId);
      if (!deviceBound && !access.allowed) {
        deviceError = null;
      } else if (!deviceBound) {
        deviceError = "Cihaz kaydı gerekli";
      }
    }

    const maxDevices = await getMaxDevicesForUser(user.id, user.dealerId, user.role);
    const currentDevices = await countActiveDevices(user.id);

    return NextResponse.json({
      success: true,
      authenticated: true,
      linkslashAccess: access.allowed,
      accessCode: access.code || null,
      deviceBound,
      deviceError,
      maxDevices,
      currentDevices,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        dealerId: user.dealerId || null,
      },
      gatewayUrl: "/gateway/linkslash",
      version,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Oturum kontrolü başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
