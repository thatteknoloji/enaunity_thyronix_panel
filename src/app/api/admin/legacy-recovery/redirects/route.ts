import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  createRedirectRuleManual,
  listRedirectRules,
} from "@/lib/legacy-recovery/recovery-executor";

export async function GET() {
  try {
    await requireAdmin();
    const items = await listRedirectRules();
    return NextResponse.json({ success: true, data: { items } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const sourceUrl = String(body.sourceUrl || "");
    const targetUrl = String(body.targetUrl || "");
    if (!sourceUrl || !targetUrl) {
      return NextResponse.json({ success: false, error: "sourceUrl ve targetUrl gerekli" }, { status: 400 });
    }
    const rule = await createRedirectRuleManual(
      sourceUrl,
      targetUrl,
      body.statusCode ? Number(body.statusCode) : 301
    );
    return NextResponse.json({ success: true, data: rule });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Redirect oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
