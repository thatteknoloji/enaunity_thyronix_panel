import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { bindDevice, touchDevice } from "@/lib/linkslash/devices";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    const access = await assertLinkSlashAccess(user);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: access.reason, code: access.code },
        { status: access.code === "AUTH_REQUIRED" ? 401 : 403 }
      );
    }

    const body = (await req.json()) as {
      deviceId?: string;
      androidId?: string;
      deviceName?: string;
    };

    if (!body.deviceId) {
      return NextResponse.json({ success: false, error: "deviceId gerekli" }, { status: 400 });
    }

    const result = await bindDevice({
      userId: user!.id,
      dealerId: user!.dealerId,
      role: user!.role,
      deviceId: body.deviceId,
      androidId: body.androidId,
      deviceName: body.deviceName,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          code: result.code,
          activeDevice: result.activeDevice,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: result.device });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cihaz kaydı başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });
    const body = (await req.json()) as { deviceId?: string };
    if (!body.deviceId) return NextResponse.json({ success: false, error: "deviceId gerekli" }, { status: 400 });
    const ok = await touchDevice(user.id, body.deviceId);
    return NextResponse.json({ success: ok });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Heartbeat başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
