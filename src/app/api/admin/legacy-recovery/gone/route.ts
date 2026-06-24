import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createGoneRuleManual, listGoneRules } from "@/lib/legacy-recovery/recovery-executor";

export async function GET() {
  try {
    await requireAdmin();
    const items = await listGoneRules();
    return NextResponse.json({ success: true, data: { items } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const url = String(body.url || "");
    if (!url) {
      return NextResponse.json({ success: false, error: "url gerekli" }, { status: 400 });
    }
    const rule = await createGoneRuleManual(url, String(body.reason || ""));
    return NextResponse.json({ success: true, data: rule });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gone kuralı oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
