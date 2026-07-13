import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listAllPodCoreProjects } from "@/lib/pod-core/project-store";
import { listCatalogFixedSizes } from "@/lib/pricing-engine/pod-price-catalog";
import { listPodProductProfiles } from "@/lib/pod-core/product-profiles/pod-product-profile-registry";

export async function GET() {
  try {
    await requireAdmin();
    const items = await listAllPodCoreProjects();
    return NextResponse.json({
      success: true,
      data: {
        items: items.map((p) => ({
          projectId: p.projectId,
          projectName: p.projectName,
          ownerUserId: p.ownerUserId,
          templateId: p.templateId,
          templateName: p.mockupTemplate.name,
          category: p.mockupTemplate.category,
          widthCm: p.widthCm,
          heightCm: p.heightCm,
          quantity: p.quantity,
          finalPrice: p.pricingSnapshot?.finalPrice ?? null,
          updatedAt: p.updatedAt,
        })),
        total: items.length,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST() {
  try {
    await requireAdmin();
    const profiles = listPodProductProfiles().map((profile) => ({
      ...profile,
      fixedSizeCount: profile.catalogId ? listCatalogFixedSizes(profile.catalogId).length : 0,
      studioHref: `/admin/pod-tasarim-studyo?template=${profile.templateId}`,
    }));
    return NextResponse.json({ success: true, data: profiles });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
