import { NextResponse } from "next/server";
import {
  ensureCategoryPresentationDefaults,
  getProductPageSettings,
  parseTrustBadges,
} from "@/lib/products/presentation";

export async function GET() {
  try {
    await ensureCategoryPresentationDefaults();
    const settings = await getProductPageSettings();
    return NextResponse.json({
      success: true,
      data: {
        defaultBadgeText: settings.defaultBadgeText,
        trustBadges: parseTrustBadges(settings.trustBadgesJson),
        showShortOnCatalog: settings.showShortOnCatalog,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
