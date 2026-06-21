import { NextResponse } from "next/server";
import { recordReferralVisit, attachReferralCookie } from "@/lib/partners/referral";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      referralCode?: string;
      landingPath?: string;
      sourceUrl?: string;
      ip?: string;
      userAgent?: string;
    };

    if (!body.referralCode) {
      return NextResponse.json({ success: false, error: "referralCode gerekli" }, { status: 400 });
    }

    const result = await recordReferralVisit({
      referralCode: body.referralCode,
      landingPath: body.landingPath || "/",
      sourceUrl: body.sourceUrl,
      ip: body.ip,
      userAgent: body.userAgent,
    });

    if (!result?.partner) {
      return NextResponse.json({ success: false, error: "Geçersiz referans kodu" }, { status: 404 });
    }

    const res = NextResponse.json({
      success: true,
      data: { referralCode: result.partner.referralCode, duplicate: result.duplicate },
    });
    attachReferralCookie(res, result.partner.referralCode);
    return res;
  } catch {
    return NextResponse.json({ success: false, error: "Takip hatası" }, { status: 500 });
  }
}
