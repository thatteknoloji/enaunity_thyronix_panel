import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings/service";

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({
      success: true,
      data: settings.resolvedNotFoundRedirectRules.filter((rule) => rule.active),
      updatedAt: settings.updatedAt,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
