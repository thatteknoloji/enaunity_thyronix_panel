import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: "E-posta gerekli" }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333";

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpires: expires },
      });
      const link = `${baseUrl}/auth/reset-password?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: "Şifre Sıfırlama — ENAUNITY",
        html: `<p>Merhaba ${user.name},</p><p>Şifrenizi sıfırlamak için <a href="${link}">buraya tıklayın</a>. Bağlantı 1 saat geçerlidir.</p>`,
      });
    } else {
      const subUser = await prisma.subUser.findUnique({ where: { email: normalized } });
      if (subUser?.active) {
        await prisma.subUser.update({
          where: { id: subUser.id },
          data: { passwordResetToken: token, passwordResetExpires: expires },
        });
        const link = `${baseUrl}/auth/reset-password?token=${token}&sub=1`;
        await sendEmail({
          to: subUser.email,
          subject: "Şifre Sıfırlama — ENAUNITY",
          html: `<p>Merhaba ${subUser.name},</p><p>Şifrenizi sıfırlamak için <a href="${link}">buraya tıklayın</a>. Bağlantı 1 saat geçerlidir.</p>`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "E-posta kayıtlıysa sıfırlama bağlantısı gönderildi.",
    });
  } catch {
    return NextResponse.json({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { token, password, confirmPassword, isSubUser } = await req.json();
    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ success: false, error: "Eksik bilgi" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Şifre en az 8 karakter olmalı" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ success: false, error: "Şifreler eşleşmiyor" }, { status: 400 });
    }

    const now = new Date();
    const hashed = await hashPassword(password);

    if (isSubUser) {
      const sub = await prisma.subUser.findFirst({
        where: { passwordResetToken: token, passwordResetExpires: { gt: now } },
      });
      if (!sub) {
        return NextResponse.json({ success: false, error: "Geçersiz veya süresi dolmuş bağlantı" }, { status: 400 });
      }
      await prisma.subUser.update({
        where: { id: sub.id },
        data: { password: hashed, passwordResetToken: null, passwordResetExpires: null },
      });
    } else {
      const user = await prisma.user.findFirst({
        where: { passwordResetToken: token, passwordResetExpires: { gt: now } },
      });
      if (!user) {
        return NextResponse.json({ success: false, error: "Geçersiz veya süresi dolmuş bağlantı" }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, passwordResetToken: null, passwordResetExpires: null },
      });
    }

    return NextResponse.json({ success: true, message: "Şifreniz güncellendi. Giriş yapabilirsiniz." });
  } catch {
    return NextResponse.json({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}
