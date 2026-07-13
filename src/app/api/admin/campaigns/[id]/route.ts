import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { buildCampaignProductCreates, parseCampaignPayload } from "@/lib/campaigns/payload";
import { removeCampaignHomeBanner, syncCampaignHomeBanner } from "@/lib/homepage/campaign-banner-sync";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { buyProducts, getProducts, ...rest } = body;
    const data = parseCampaignPayload(rest);

    await prisma.campaignProduct.deleteMany({ where: { campaignId: id } });

    const productCreates = buildCampaignProductCreates(buyProducts, getProducts);

    await prisma.campaign.update({
      where: { id },
      data: {
        ...data,
        products: productCreates.length > 0 ? { create: productCreates } : undefined,
      },
    });

    await syncCampaignHomeBanner(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await removeCampaignHomeBanner(id);
    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
