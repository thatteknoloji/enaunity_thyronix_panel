import { NextResponse } from "next/server";
import {
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
} from "@/lib/thyronix/access";
import { crawlCompetitorStore } from "@/lib/thyronix/competitor-crawler";

export async function POST(req: Request) {
  try {
    await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const url = String(body.url || "");
    const marketplace = body.marketplace ? String(body.marketplace) : undefined;

    const snapshot = await crawlCompetitorStore({ url, marketplace });
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    return thyronixErrorResponse(error);
  }
}
