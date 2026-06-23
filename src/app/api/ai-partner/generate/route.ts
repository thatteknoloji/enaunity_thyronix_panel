import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { AI_PARTNER_TASKS, generateAiPartnerContent } from "@/lib/ai-partner/generate";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });
    if (user.role !== "dealer" && user.role !== "admin" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Bayi veya partner erişimi gerekli" }, { status: 403 });
    }

    const body = (await req.json()) as { task?: string; context?: Record<string, string> };
    const task = body.task as (typeof AI_PARTNER_TASKS)[number];
    if (!task || !AI_PARTNER_TASKS.includes(task)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz görev", availableTasks: AI_PARTNER_TASKS },
        { status: 400 }
      );
    }

    const result = await generateAiPartnerContent(task, body.context || {}, { dealerId: user.dealerId });
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Üretim başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, data: { tasks: AI_PARTNER_TASKS } });
}
