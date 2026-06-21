import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertPodCreatorAccess, getPodLicenseStatus } from "@/lib/pod/access";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş gerekli", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    if (!user.dealerId) {
      return NextResponse.json({
        success: true,
        data: { hasLicense: false, licenseState: "none", planKey: null, limits: null, featureStatus: "COMING_SOON" },
      });
    }

    const access = await assertPodCreatorAccess(user);
    const status = await getPodLicenseStatus(user.dealerId);

    if (!access.allowed) {
      return NextResponse.json({
        success: true,
        data: { ...status, hasLicense: false },
      });
    }

    return NextResponse.json({ success: true, data: status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Durum alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
