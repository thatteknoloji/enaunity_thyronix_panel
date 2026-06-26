import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { crawlCompetitorStore } from "@/lib/thyronix/competitor-crawler";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const url = String(body.url || "");
    const marketplace = body.marketplace ? String(body.marketplace) : undefined;

    const snapshot = await crawlCompetitorStore({ url, marketplace });
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Rakip taraması başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
