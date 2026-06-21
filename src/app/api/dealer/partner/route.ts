import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { applyForPartner, getPartnerProfileByUserId } from "@/lib/partners/profile";
import { getPartnerStats } from "@/lib/partners/commission-service";
import { listCommissions, listReferralsForPartner } from "@/lib/partners/affiliate";
import { buildReferralSlugLink } from "@/lib/partners/referral";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

    const profile = await getPartnerProfileByUserId(user.id);
    if (!profile) {
      return NextResponse.json({
        success: true,
        data: { profile: null, canApply: true },
      });
    }

    const [referrals, commissions, stats] = await Promise.all([
      listReferralsForPartner(profile.id, 50),
      listCommissions({ partnerId: profile.id }, 50),
      getPartnerStats(profile.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        profile,
        referralLink: buildReferralSlugLink(profile.referralSlug),
        referrals,
        commissions,
        stats,
        hybridNote:
          "Bayi iskontosu ürün fiyatına uygulanır. Affiliate komisyonu sipariş tamamlandıktan sonra ayrı hesaplanır.",
        canApply: false,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Partner verisi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

    const profile = await applyForPartner(user.id, user.dealerId, "AFFILIATE");
    return NextResponse.json({
      success: true,
      data: profile,
      message: "Partner başvurunuz alındı. Admin onayı sonrası ACTIVE olacaktır.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Başvuru başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
