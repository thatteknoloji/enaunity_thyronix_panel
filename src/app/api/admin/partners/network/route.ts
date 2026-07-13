import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PARTNER_TYPE_LABELS, normalizePartnerType } from "@/lib/partners/types";

export async function GET() {
  try {
    await requireAdmin();
    const profiles = await prisma.partnerProfile.findMany({
      where: { sponsorPartnerId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        sponsorPartner: { select: { id: true, referralCode: true, partnerType: true } },
        _count: { select: { referrals: true, commissions: true } },
      },
    });

    const sponsors = await prisma.partnerProfile.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, referralCode: true, partnerType: true, _count: { select: { sponsoredPartners: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: {
        networkLinks: profiles.map((p) => ({
          id: p.id,
          partnerType: p.partnerType,
          typeLabel: PARTNER_TYPE_LABELS[normalizePartnerType(p.partnerType)],
          referralCode: p.referralCode,
          status: p.status,
          sponsor: p.sponsorPartner,
          counts: p._count,
          createdAt: p.createdAt,
        })),
        topSponsors: sponsors.map((s) => ({
          id: s.id,
          referralCode: s.referralCode,
          typeLabel: PARTNER_TYPE_LABELS[normalizePartnerType(s.partnerType)],
          networkSize: s._count.sponsoredPartners,
        })),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ağ verisi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}
