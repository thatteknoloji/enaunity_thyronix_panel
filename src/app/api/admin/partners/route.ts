import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  approvePartner,
  assignSponsor,
  listPartnerProfiles,
  listPartnerNetwork,
  refreshReferralCode,
  updatePartnerProfile,
  updatePartnerStatus,
} from "@/lib/partners/profile";
import { getPartnerStats } from "@/lib/partners/commission-service";
import { PARTNER_TYPE_LABELS, normalizePartnerType } from "@/lib/partners/types";

export async function GET() {
  try {
    await requireAdmin();
    const profiles = await listPartnerProfiles(200);
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const stats = await getPartnerStats(p.id);
        const type = normalizePartnerType(p.partnerType);
        return {
          ...p,
          partnerTypeLabel: PARTNER_TYPE_LABELS[type] || type,
          normalizedType: type,
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
    const admin = await requireAdmin();
    const body = (await req.json()) as {
      id?: string;
      action?: string;
      status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
      partnerType?: string;
      grantPodLicense?: boolean;
      sponsorPartnerId?: string | null;
      defaultCommissionRate?: number;
      moduleCommissionRate?: number;
      podCommissionRate?: number;
      networkOverrideRate?: number;
    };

    if (!body.id) return NextResponse.json({ success: false, error: "id gerekli" }, { status: 400 });

    let row;

    switch (body.action) {
      case "approve":
        row = await approvePartner(body.id, body.partnerType);
        break;
      case "suspend":
        row = await updatePartnerStatus(body.id, "SUSPENDED");
        break;
      case "activate":
        row = await updatePartnerStatus(body.id, "ACTIVE");
        break;
      case "reject":
        row = await updatePartnerStatus(body.id, "REJECTED");
        break;
      case "change_type":
        if (!body.partnerType) return NextResponse.json({ success: false, error: "partnerType gerekli" }, { status: 400 });
        row = await updatePartnerProfile(body.id, { partnerType: normalizePartnerType(body.partnerType) });
        if (body.grantPodLicense && normalizePartnerType(body.partnerType) === "POD_CREATOR") {
          const profile = await prisma.partnerProfile.findUnique({
            where: { id: body.id },
            select: { dealerId: true },
          });
          if (profile?.dealerId) {
            const { upsertModuleLicense } = await import("@/lib/admin/module-access-admin");
            await upsertModuleLicense({
              dealerId: profile.dealerId,
              moduleKey: "POD_CREATOR",
              planKey: "starter",
              status: "ACTIVE",
              months: 12,
            });
          }
        }
        break;
      case "assign_sponsor":
        row = await assignSponsor(body.id, body.sponsorPartnerId ?? null);
        break;
      case "refresh_code":
        row = await refreshReferralCode(body.id);
        break;
      case "update_rates":
        row = await updatePartnerProfile(body.id, {
          defaultCommissionRate: body.defaultCommissionRate,
          moduleCommissionRate: body.moduleCommissionRate,
          podCommissionRate: body.podCommissionRate,
          networkOverrideRate: body.networkOverrideRate,
        });
        break;
      default:
        if (body.status === "ACTIVE") {
          row = await approvePartner(body.id, body.partnerType);
        } else if (body.status) {
          row = await updatePartnerStatus(body.id, body.status);
        } else {
          return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
        }
    }

    await logAdminAction(admin.id, admin.name, "partner_update", body.id, body.action || body.status || "");
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncelleme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
