import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPartnerProfileByUserId } from "@/lib/partners/profile";
import {
  createPartnerPayoutRequest,
  getPayoutSummary,
  getPartnerPayoutSettings,
  listPartnerPayouts,
} from "@/lib/partners/payout-service";
import { PAYOUT_STATUS_LABELS } from "@/lib/partners/types";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

    const profile = await getPartnerProfileByUserId(user.id);
    if (!profile) {
      return NextResponse.json({ success: false, error: "Partner profili bulunamadı" }, { status: 404 });
    }

    const [summary, settings, payouts] = await Promise.all([
      getPayoutSummary(profile.id),
      getPartnerPayoutSettings(profile.id),
      listPartnerPayouts(profile.id, 50),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        settings,
        withdrawableBalance: summary.withdrawableBalance,
        payouts: payouts.map((p) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          statusLabel: PAYOUT_STATUS_LABELS[p.status] || p.status,
          iban: p.iban,
          accountHolder: p.accountHolder,
          note: p.note,
          adminNote: p.adminNote,
          invoiceUrl: p.invoiceUrl,
          requestedAt: p.requestedAt,
          processedAt: p.processedAt,
          paidAt: p.paidAt,
          createdAt: p.createdAt,
          commissionCount: p.commissions.length,
        })),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ödeme verisi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

    const profile = await getPartnerProfileByUserId(user.id);
    if (!profile) {
      return NextResponse.json({ success: false, error: "Partner profili bulunamadı" }, { status: 404 });
    }

    const body = (await req.json()) as {
      amount?: number;
      iban?: string;
      accountHolder?: string;
      taxIdentityNumber?: string;
      invoiceUrl?: string;
      note?: string;
    };

    const summary = await getPayoutSummary(profile.id);
    const settings = await getPartnerPayoutSettings(profile.id);

    const payout = await createPartnerPayoutRequest({
      partnerId: profile.id,
      amount: body.amount ?? summary.withdrawableBalance,
      iban: body.iban || settings.iban || "",
      accountHolder: body.accountHolder || settings.accountHolder || "",
      taxIdentityNumber: body.taxIdentityNumber || settings.taxIdentityNumber,
      invoiceUrl: body.invoiceUrl,
      note: body.note,
    });

    return NextResponse.json({
      success: true,
      data: payout,
      message: "Ödeme talebiniz alındı",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ödeme talebi oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
