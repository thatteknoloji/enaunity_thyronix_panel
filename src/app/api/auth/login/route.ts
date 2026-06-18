import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

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

      const token = signToken(user);

      const response = NextResponse.json({
        success: true,
        data: { id: user.id, name: user.name, email: user.email, role: user.role, dealerId: user.dealerId },
      });

      response.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return response;
    }

    // Check SubUser
    const subUser = await prisma.subUser.findUnique({ where: { email } });
    if (!subUser || !subUser.active) {
      return NextResponse.json({ success: false, error: "Geçersiz giriş bilgileri" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, subUser.password);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Geçersiz giriş bilgileri" }, { status: 401 });
    }

    const token = signToken({
      id: subUser.id,
      name: subUser.name,
      email: subUser.email,
      role: "dealer",
      dealerId: subUser.dealerId,
      subUserRole: subUser.role,
    } as any);

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

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

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
