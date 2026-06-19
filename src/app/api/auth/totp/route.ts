import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resolveSecurityAccount, updateSecurityAccount } from "@/lib/auth/security-account";
import { generateTotpSecret, getTotpAuthUri, verifyTotp } from "@/lib/auth/totp";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const account = await resolveSecurityAccount(user);
    if (!account) {
      return NextResponse.json({ success: false, error: "Hesap bulunamadı" }, { status: 404 });
    }

    const secret = generateTotpSecret();
    await updateSecurityAccount(account, { totpSecret: secret, totpEnabled: false });

    return NextResponse.json({
      success: true,
      data: {
        secret,
        uri: getTotpAuthUri(secret, account.email),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuth();
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ success: false, error: "Doğrulama kodu gerekli" }, { status: 400 });
    }

    const account = await resolveSecurityAccount(user);
    if (!account?.totpSecret) {
      return NextResponse.json({ success: false, error: "Önce 2FA kurulumunu başlatın" }, { status: 400 });
    }
    if (!verifyTotp(account.totpSecret, code)) {
      return NextResponse.json({ success: false, error: "Geçersiz doğrulama kodu" }, { status: 400 });
    }

    await updateSecurityAccount(account, { totpEnabled: true });
    return NextResponse.json({ success: true, message: "İki faktörlü doğrulama etkinleştirildi" });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuth();
    const { code } = await req.json();
    const account = await resolveSecurityAccount(user);
    if (!account?.totpEnabled || !account.totpSecret) {
      return NextResponse.json({ success: false, error: "2FA zaten kapalı" }, { status: 400 });
    }
    if (!verifyTotp(account.totpSecret, code)) {
      return NextResponse.json({ success: false, error: "Geçersiz doğrulama kodu" }, { status: 400 });
    }

    await updateSecurityAccount(account, { totpEnabled: false, totpSecret: null });
    return NextResponse.json({ success: true, message: "İki faktörlü doğrulama kapatıldı" });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
