import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getProductionJob, updateProductionJob } from "@/lib/production-center/job-service";
import type { UpdateProductionJobInput } from "@/lib/production-center/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const job = await getProductionJob(id);
    if (!job) {
      return NextResponse.json({ success: false, error: "Üretim işi bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: job });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = (await req.json()) as UpdateProductionJobInput;
    const job = await updateProductionJob(id, body);
    return NextResponse.json({ success: true, data: job });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    const status = msg.includes("bulunamadı") ? 404 : msg.includes("Geçersiz") ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
