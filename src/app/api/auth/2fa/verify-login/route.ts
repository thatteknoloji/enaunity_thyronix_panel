import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, verify2FAChallenge } from "@/lib/auth";
import { verifyTotp } from "@/lib/auth/totp";

function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function POST(req: Request) {
  try {
    const { challenge, code } = await req.json();
    if (!challenge || !code) {
      return NextResponse.json({ success: false, error: "Doğrulama kodu gerekli" }, { status: 400 });
    }

    const payload = verify2FAChallenge(challenge);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Oturum süresi doldu, tekrar giriş yapın" }, { status: 401 });
    }

    if (payload.isSubUser) {
      const subUser = await prisma.subUser.findUnique({ where: { id: payload.id } });
      if (!subUser?.active || !subUser.totpSecret || !subUser.totpEnabled) {
        return NextResponse.json({ success: false, error: "Geçersiz istek" }, { status: 400 });
      }
      if (!verifyTotp(subUser.totpSecret, code)) {
        return NextResponse.json({ success: false, error: "Geçersiz doğrulama kodu" }, { status: 401 });
      }

      const token = signToken({
        id: subUser.id,
        email: subUser.email,
        role: "dealer",
        dealerId: subUser.dealerId,
        subUserRole: subUser.role,
      } as Parameters<typeof signToken>[0] & { subUserRole: string });

      const response = NextResponse.json({
        success: true,
        data: {
          id: subUser.id,
          name: subUser.name,
          email: subUser.email,
          role: "dealer",
          dealerId: subUser.dealerId,
          isSubUser: true,
        },
      });
      setAuthCookie(response, token);
      return response;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user?.totpSecret || !user.totpEnabled) {
      return NextResponse.json({ success: false, error: "Geçersiz istek" }, { status: 400 });
    }
    if (!verifyTotp(user.totpSecret, code)) {
      return NextResponse.json({ success: false, error: "Geçersiz doğrulama kodu" }, { status: 401 });
    }

    const token = signToken(user);
    const response = NextResponse.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role, dealerId: user.dealerId },
    });
    setAuthCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
