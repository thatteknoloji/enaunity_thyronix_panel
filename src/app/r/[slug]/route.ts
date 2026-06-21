import { NextRequest, NextResponse } from "next/server";
import { attachReferralCookie, getPartnerBySlug, recordReferralVisit } from "@/lib/partners/referral";

type Props = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  const { slug } = await params;
  const partner = await getPartnerBySlug(slug);

  const target = new URL("/", request.url);
  const ref = request.nextUrl.searchParams.get("to");
  if (ref && ref.startsWith("/")) {
    target.pathname = ref.split("?")[0];
    const qs = ref.includes("?") ? ref.split("?")[1] : "";
    if (qs) target.search = qs;
  }

  if (!partner) {
    return NextResponse.redirect(target);
  }

  await recordReferralVisit({
    referralCode: partner.referralCode,
    landingPath: target.pathname,
    sourceUrl: request.url,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "",
    userAgent: request.headers.get("user-agent") || "",
  });

  const res = NextResponse.redirect(target);
  attachReferralCookie(res, partner.referralCode);
  return res;
}
