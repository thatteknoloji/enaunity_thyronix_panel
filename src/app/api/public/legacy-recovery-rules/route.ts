import { NextResponse } from "next/server";
import {
  getActiveLegacyGoneRules,
  getActiveLegacyRedirectRules,
} from "@/lib/legacy-recovery/recovery-executor";

export async function GET() {
  try {
    const [redirects, gone] = await Promise.all([
      getActiveLegacyRedirectRules(),
      getActiveLegacyGoneRules(),
    ]);
    return NextResponse.json({
      success: true,
      data: { redirects, gone },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
