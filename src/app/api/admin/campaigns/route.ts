import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { buildCampaignProductCreates, parseCampaignPayload } from "@/lib/campaigns/payload";
import { syncCampaignHomeBanner } from "@/lib/homepage/campaign-banner-sync";

export async function GET() {
  try {
    await requireAdmin();
    const campaigns = await prisma.campaign.findMany({
      include: { products: { include: { product: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: campaigns });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { buyProducts, getProducts, ...rest } = body;
    const scalars = parseCampaignPayload(rest);

    const name = typeof scalars.name === "string" ? scalars.name.trim() : "";
    const type = typeof scalars.type === "string" ? scalars.type.trim() : "";
    if (!name || !type) {
      return NextResponse.json({ success: false, error: "Kampanya adı ve türü gerekli" }, { status: 400 });
    }

    const productCreates = buildCampaignProductCreates(buyProducts, getProducts);

    const campaign = await prisma.campaign.create({
      data: {
        ...scalars,
        name,
        type,
        products: productCreates.length > 0 ? { create: productCreates } : undefined,
      },
    });
    await syncCampaignHomeBanner(campaign.id);
    return NextResponse.json({ success: true, data: campaign });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
