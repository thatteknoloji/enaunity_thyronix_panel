import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { crawlCompetitorStore } from "@/lib/thyronix/competitor-crawler";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const isAdmin = isAdminRole(user.role);
    if (!user.dealerId && !isAdmin) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 403 });
    }

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
