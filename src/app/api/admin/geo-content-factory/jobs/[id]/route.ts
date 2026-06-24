import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { cancelGeoJob, getGeoJob } from "@/lib/geo-content-factory/geo-content-factory-service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const job = await getGeoJob(id);
    if (!job) {
      return NextResponse.json({ success: false, error: "İş bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: job });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    if (body.action === "cancel") {
      const job = await cancelGeoJob(id);
      return NextResponse.json({ success: true, data: job });
    }
    return NextResponse.json({ success: false, error: "Geçersiz aksiyon" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
