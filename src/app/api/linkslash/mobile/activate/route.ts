import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { redeemActivationCode } from "@/lib/linkslash/activation";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş gerekli", code: "AUTH_REQUIRED" }, { status: 401 });
    }

    const body = (await req.json()) as { code?: string };
    if (!body.code?.trim()) {
      return NextResponse.json({ success: false, error: "Aktivasyon kodu gerekli" }, { status: 400 });
    }

    const result = await redeemActivationCode(body.code, user.id, user.dealerId);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { licenseId: result.licenseId, endsAt: result.endsAt, durationDays: result.durationDays },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Aktivasyon başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
