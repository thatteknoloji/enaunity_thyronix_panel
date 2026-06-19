import { NextResponse } from "next/server";
import { requireAuth, verifyPassword, hashPassword } from "@/lib/auth";
import { resolveSecurityAccount, updateSecurityAccount } from "@/lib/auth/security-account";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ success: false, error: "Tüm alanlar zorunlu" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, error: "Yeni şifre en az 8 karakter olmalı" }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, error: "Yeni şifreler eşleşmiyor" }, { status: 400 });
    }

    const account = await resolveSecurityAccount(user);
    if (!account) {
      return NextResponse.json({ success: false, error: "Hesap bulunamadı" }, { status: 404 });
    }

    const stored = user.isSubUser
      ? await prisma.subUser.findUnique({ where: { id: user.id }, select: { password: true } })
      : await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });

    if (!stored || !(await verifyPassword(currentPassword, stored.password))) {
      return NextResponse.json({ success: false, error: "Mevcut şifre hatalı" }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);
    await updateSecurityAccount(account, { password: hashed });

    return NextResponse.json({ success: true, message: "Şifreniz güncellendi" });
  } catch {
    return NextResponse.json({ success: false, error: "İşlem başarısız" }, { status: 401 });
  }
}
