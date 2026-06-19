import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resolveSecurityAccount } from "@/lib/auth/security-account";

export async function GET() {
  try {
    const user = await requireAuth();
    const account = await resolveSecurityAccount(user);
    if (!account) {
      return NextResponse.json({ success: false, error: "Hesap bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: account.email,
        name: account.name,
        totpEnabled: account.totpEnabled,
        isSubUser: user.isSubUser ?? false,
        role: user.role,
        hasDealerAccount: Boolean(user.dealerId),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
