import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listAdminPayouts } from "@/lib/partners/payout-service";
import { PARTNER_TYPE_LABELS, PAYOUT_STATUS_LABELS, normalizePartnerType } from "@/lib/partners/types";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const filters = {
      status: url.searchParams.get("status") || undefined,
      partnerType: url.searchParams.get("partnerType") || undefined,
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
      search: url.searchParams.get("search") || undefined,
    };

    const rows = await listAdminPayouts(filters, 300);

    return NextResponse.json({
      success: true,
      data: rows.map((p) => ({
        id: p.id,
        partnerId: p.partnerId,
        partnerName: p.partnerName,
        partnerEmail: p.partnerEmail,
        partnerType: p.partnerType,
        partnerTypeLabel: PARTNER_TYPE_LABELS[normalizePartnerType(p.partnerType)],
        referralCode: p.referralCode,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        statusLabel: PAYOUT_STATUS_LABELS[p.status] || p.status,
        iban: p.iban,
        accountHolder: p.accountHolder,
        taxIdentityNumber: p.taxIdentityNumber,
        invoiceUrl: p.invoiceUrl,
        note: p.note,
        adminNote: p.adminNote,
        requestedAt: p.requestedAt,
        processedAt: p.processedAt,
        paidAt: p.paidAt,
        commissionCount: p.commissionCount,
        createdAt: p.createdAt,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ödemeler alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}
