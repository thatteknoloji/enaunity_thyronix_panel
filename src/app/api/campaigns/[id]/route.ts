import { NextResponse } from "next/server";
import { getPublicCampaignById } from "@/lib/campaigns/public";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getPublicCampaignById(id);
    if (!data) {
      return NextResponse.json({ success: false, error: "Kampanya bulunamadı veya süresi doldu" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
