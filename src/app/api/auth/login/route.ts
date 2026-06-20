import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken, sign2FAChallenge } from "@/lib/auth";
import bcrypt from "bcryptjs";

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
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "E-posta ve şifre gerekli" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return NextResponse.json({ success: false, error: "Geçersiz giriş bilgileri" }, { status: 401 });
      }

      if (user.role === "user") {
        if (user.status === "rejected") {
          return NextResponse.json(
            {
              success: false,
              error: user.rejectionReason
                ? `Başvurunuz reddedildi: ${user.rejectionReason}`
                : "Başvurunuz reddedildi. Destek ile iletişime geçin.",
            },
            { status: 403 }
          );
        }
        if (user.status === "suspended") {
          return NextResponse.json(
            { success: false, error: "Hesabınız askıya alınmış. Destek ile iletişime geçin." },
            { status: 403 }
          );
        }
        // pending users can login to see application status
      }

      if (user.totpEnabled) {
        return NextResponse.json({
          success: true,
          requires2FA: true,
          challenge: sign2FAChallenge({ id: user.id, isSubUser: false }),
          data: { name: user.name, email: user.email },
        });
      }

      const token = signToken(user);
      const response = NextResponse.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          dealerId: user.dealerId,
          status: user.status,
        },
      });
      setAuthCookie(response, token);
      return response;
    }

    const subUser = await prisma.subUser.findUnique({ where: { email } });
    if (!subUser || !subUser.active) {
      return NextResponse.json({ success: false, error: "Geçersiz giriş bilgileri" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, subUser.password);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Geçersiz giriş bilgileri" }, { status: 401 });
    }

    if (subUser.totpEnabled) {
      return NextResponse.json({
        success: true,
        requires2FA: true,
        challenge: sign2FAChallenge({ id: subUser.id, isSubUser: true }),
        data: { name: subUser.name, email: subUser.email },
      });
    }

    const token = signToken({
      id: subUser.id,
      name: subUser.name,
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
        subUserRole: subUser.role,
        isSubUser: true,
      },
    });
    setAuthCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
