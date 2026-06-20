import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { appendLegalAuditLog } from "@/lib/legal/audit-log";
import { getRequestMetaFromRequest } from "@/lib/legal/request-meta";


async function getOrCreateSessionId(): Promise<string> {
  const c = await cookies();
  return c.get("ena_cookie_sid")?.value || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const meta = getRequestMetaFromRequest(req);
    const user = await getSession();

    let sessionId = await getOrCreateSessionId();
    if (!sessionId) {
      sessionId = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    const data = {
      necessary: true,
      analytics: !!body.analytics,
      marketing: !!body.marketing,
      preferences: !!body.preferences,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    };

    await prisma.cookieConsent.upsert({
      where: { sessionId },
      create: { sessionId, userId: user?.id || null, ...data },
      update: { userId: user?.id || null, ...data },
    });

    await appendLegalAuditLog({
      eventType: "cookie_consent",
      userId: user?.id,
      email: user?.email || "",
      ipAddress: meta.ipAddress,
      payload: { sessionId, ...data },
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set("ena_cookie_sid", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ success: false, error: "Kayıt başarısız" }, { status: 500 });
  }
}

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  if (!sessionId) return NextResponse.json({ success: true, data: null });
  const row = await prisma.cookieConsent.findUnique({ where: { sessionId } });
  return NextResponse.json({ success: true, data: row });
}
