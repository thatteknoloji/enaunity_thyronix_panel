import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings, updateSiteSettings, type SiteSettingsDTO } from "@/lib/site-settings/service";

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
    const payload: Partial<SiteSettingsDTO> = {
      faviconUrl: body.faviconUrl,
      siteTitle: body.siteTitle,
      defaultMetaDescription: body.defaultMetaDescription,
      ogImageUrl: body.ogImageUrl,
      ogSiteName: body.ogSiteName,
      titleTemplate: body.titleTemplate,
      themeColor: body.themeColor,
      brandPrimaryColor: body.brandPrimaryColor,
      defaultKeywords: body.defaultKeywords,
      appleTouchIconUrl: body.appleTouchIconUrl,
      organizationName: body.organizationName,
      supportEmail: body.supportEmail,
      robotsNoIndex: body.robotsNoIndex,
      twitterHandle: body.twitterHandle,
      locale: body.locale,
      copyrightText: body.copyrightText,
    };
    const data = await updateSiteSettings(payload);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[Site Settings]", e);
    return NextResponse.json({ success: false, error: "Kayıt hatası" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  return POST(req);
}
