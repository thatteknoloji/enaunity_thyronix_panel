import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildReferralSlugLink } from "@/lib/partners/referral";

export async function GET() {
  try {
    await requireAdmin();
    const affiliates = await prisma.partnerProfile.findMany({
      where: { partnerType: { in: ["AFFILIATE", "BAYI_PLUS", "AI_PARTNER"] }, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      success: true,
      data: {
        affiliates: affiliates.map((a) => ({
          ...a,
          referralLink: buildReferralSlugLink(a.referralSlug),
        })),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Affiliate listesi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}
