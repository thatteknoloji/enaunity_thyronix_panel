import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  approvePartner,
  listPartnerProfiles,
  updatePartnerRates,
  updatePartnerStatus,
} from "@/lib/partners/profile";
import { getPartnerStats } from "@/lib/partners/commission-service";
import { PARTNER_TYPE_LABELS } from "@/lib/partners/types";

export async function GET() {
  try {
    await requireAdmin();
    const profiles = await listPartnerProfiles(200);
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const stats = await getPartnerStats(p.id);
        return {
          ...p,
          partnerTypeLabel: PARTNER_TYPE_LABELS[p.partnerType as keyof typeof PARTNER_TYPE_LABELS] || p.partnerType,
          stats,
        };
      })
    );
    return NextResponse.json({ success: true, data: enriched });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Partner listesi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as {
      id?: string;
      status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
      commissionRate?: number;
      recurringCommissionRate?: number;
      action?: "approve";
    };
    if (!body.id) return NextResponse.json({ success: false, error: "id gerekli" }, { status: 400 });

    if (body.action === "approve" || body.status === "ACTIVE") {
      const row = await approvePartner(body.id);
      return NextResponse.json({ success: true, data: row });
    }
    if (body.status) {
      const row = await updatePartnerStatus(body.id, body.status);
      return NextResponse.json({ success: true, data: row });
    }
    if (body.commissionRate != null || body.recurringCommissionRate != null) {
      const row = await updatePartnerRates(body.id, {
        commissionRate: body.commissionRate,
        recurringCommissionRate: body.recurringCommissionRate,
      });
      return NextResponse.json({ success: true, data: row });
    }
    return NextResponse.json({ success: false, error: "Güncellenecek alan yok" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncelleme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
