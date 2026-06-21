import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPartnerProfileByUserId } from "@/lib/partners/profile";
import { getPartnerStats } from "@/lib/partners/commission-service";
import { listCommissions, listPayouts, listReferralsForPartner } from "@/lib/partners/partner-commissions";
import { buildReferralSlugLink } from "@/lib/partners/referral";
import { PARTNER_TYPE_LABELS, normalizePartnerType } from "@/lib/partners/types";
import { listPartnerNetwork } from "@/lib/partners/profile";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

    const profile = await getPartnerProfileByUserId(user.id);
    if (!profile) {
      return NextResponse.json({ success: true, data: { profile: null, canApply: true } });
    }

    const [referrals, commissions, payouts, stats, network] = await Promise.all([
      listReferralsForPartner(profile.id, 20),
      listCommissions({ partnerId: profile.id }, 50),
      listPayouts(profile.id, 20),
      getPartnerStats(profile.id),
      listPartnerNetwork(profile.id),
    ]);

    const type = normalizePartnerType(profile.partnerType);

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          ...profile,
          partnerTypeLabel: PARTNER_TYPE_LABELS[type] || type,
          normalizedType: type,
        },
        referralLink: buildReferralSlugLink(profile.referralSlug),
        referrals,
        commissions: commissions.map((c) => ({
          id: c.id,
          commissionType: c.commissionType,
          amount: c.amount,
          status: c.status,
          createdAt: c.createdAt,
          note: c.note,
        })),
        payouts,
        stats,
        network,
        canApply: false,
        hybridNote:
          "Profesyonel bayi iskontosu ürün fiyatına uygulanır. Partner komisyonu sipariş/modül tamamlandıktan sonra ayrı hesaplanır.",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Partner verisi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
