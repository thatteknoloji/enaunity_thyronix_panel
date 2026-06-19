import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseCampaignPayload } from "@/lib/campaigns/payload";
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
    const data = parseCampaignPayload(rest);

    const campaign = await prisma.campaign.create({
      data: {
        ...data,
        products: {
          create: [
            ...(buyProducts || []).map((productId: string) => ({ type: "buy", productId, quantity: 1 })),
            ...(getProducts || []).map((productId: string) => ({ type: "get", productId, quantity: 1 })),
          ],
        },
      },
    });
    await syncCampaignHomeBanner(campaign.id);
    return NextResponse.json({ success: true, data: campaign });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
