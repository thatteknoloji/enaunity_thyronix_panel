import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings/service";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getSiteSettings();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = await updateSiteSettings({
      faviconUrl: body.faviconUrl,
      siteTitle: body.siteTitle,
      defaultMetaDescription: body.defaultMetaDescription,
      ogImageUrl: body.ogImageUrl,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[Site Settings]", e);
    return NextResponse.json({ success: false, error: "Kayıt hatası" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  return POST(req);
}
