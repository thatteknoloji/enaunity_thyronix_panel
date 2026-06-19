import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getHeroSettings, updateHeroSettings } from "@/lib/homepage/service";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getHeroSettings();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = await updateHeroSettings(body);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Kaydedilemedi" }, { status: 500 });
  }
}
