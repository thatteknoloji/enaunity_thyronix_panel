import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getPartnerDetailForAdmin,
  updateAdminPartnerPayoutRules,
  updatePartnerPayoutSettings,
} from "@/lib/partners/payout-service";
import { updatePartnerProfile } from "@/lib/partners/profile";
import { PARTNER_TYPE_LABELS, normalizePartnerType } from "@/lib/partners/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const detail = await getPartnerDetailForAdmin(id);
    if (!detail) {
      return NextResponse.json({ success: false, error: "Partner bulunamadı" }, { status: 404 });
    }

    const type = normalizePartnerType(detail.profile.partnerType);
    return NextResponse.json({
      success: true,
      data: {
        ...detail,
        partnerTypeLabel: PARTNER_TYPE_LABELS[type],
        normalizedType: type,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Detay alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as {
      action?: string;
      payoutMinAmount?: number;
      invoiceRequired?: boolean;
      iban?: string;
      accountHolder?: string;
      taxIdentityNumber?: string;
      moduleCommissionRate?: number;
      networkOverrideRate?: number;
      podCommissionRate?: number;
      defaultCommissionRate?: number;
    };

    if (body.action === "update_payout_rules") {
      const settings = await updateAdminPartnerPayoutRules(id, {
        payoutMinAmount: body.payoutMinAmount,
        invoiceRequired: body.invoiceRequired,
      });
      return NextResponse.json({ success: true, data: settings });
    }

    if (body.action === "update_payout_settings") {
      const settings = await updatePartnerPayoutSettings(
        id,
        {
          iban: body.iban,
          accountHolder: body.accountHolder,
          taxIdentityNumber: body.taxIdentityNumber,
        },
        {
          admin: true,
          payoutMinAmount: body.payoutMinAmount,
          invoiceRequired: body.invoiceRequired,
        }
      );
      return NextResponse.json({ success: true, data: settings });
    }

    if (body.action === "update_rates") {
      const row = await updatePartnerProfile(id, {
        moduleCommissionRate: body.moduleCommissionRate,
        networkOverrideRate: body.networkOverrideRate,
        podCommissionRate: body.podCommissionRate,
        defaultCommissionRate: body.defaultCommissionRate,
      });
      return NextResponse.json({ success: true, data: row });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncelleme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
