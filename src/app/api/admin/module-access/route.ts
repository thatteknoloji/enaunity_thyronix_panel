import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  createProductUserForDealer,
  getDealerUsers,
  getModuleAccessOverview,
  isAdminModuleKey,
  provisionModuleAccess,
  upsertModuleLicense,
} from "@/lib/admin/module-access-admin";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const moduleKey = searchParams.get("moduleKey") || "";
    const dealerId = searchParams.get("dealerId");

    if (dealerId) {
      const users = await getDealerUsers(dealerId);
      return NextResponse.json({ success: true, data: { users } });
    }

    if (!isAdminModuleKey(moduleKey)) {
      return NextResponse.json({ success: false, error: "moduleKey=THYRONIX veya HIVE gerekli" }, { status: 400 });
    }

    const data = await getModuleAccessOverview(moduleKey);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yetkisiz";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const {
      action = "provision",
      dealerId,
      moduleKey,
      planKey,
      status = "ACTIVE",
      userId,
      createProductUser = false,
      trialDays,
      months,
    } = body;

    if (!dealerId || !isAdminModuleKey(moduleKey)) {
      return NextResponse.json({ success: false, error: "dealerId ve geçerli moduleKey zorunlu" }, { status: 400 });
    }

    if (action === "create_user") {
      if (!userId) {
        return NextResponse.json({ success: false, error: "userId zorunlu" }, { status: 400 });
      }
      const data = await createProductUserForDealer({ dealerId, moduleKey, userId });
      return NextResponse.json({ success: true, data });
    }

    if (action === "license_only") {
      if (!planKey) {
        return NextResponse.json({ success: false, error: "planKey zorunlu" }, { status: 400 });
      }
      const license = await upsertModuleLicense({
        dealerId,
        moduleKey,
        planKey,
        status,
        trialDays,
        months,
      });
      return NextResponse.json({ success: true, data: { license } });
    }

    if (!planKey) {
      return NextResponse.json({ success: false, error: "planKey zorunlu" }, { status: 400 });
    }

    const data = await provisionModuleAccess({
      dealerId,
      moduleKey,
      planKey,
      status,
      userId,
      createProductUser,
      trialDays,
      months,
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Sunucu hatası" },
      { status: 400 },
    );
  }
}
