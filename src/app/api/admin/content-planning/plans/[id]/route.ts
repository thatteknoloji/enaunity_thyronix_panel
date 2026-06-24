import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { archiveContentPlan, getContentPlan } from "@/lib/content-planning/content-planning-service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const plan = await getContentPlan(id);
    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: plan });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    if (body.action === "archive") {
      const plan = await archiveContentPlan(id);
      return NextResponse.json({ success: true, data: plan });
    }
    return NextResponse.json({ success: false, error: "Geçersiz aksiyon" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
