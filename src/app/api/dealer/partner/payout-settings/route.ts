import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPartnerProfileByUserId } from "@/lib/partners/profile";
import { getPartnerPayoutSettings, updatePartnerPayoutSettings } from "@/lib/partners/payout-service";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

    const profile = await getPartnerProfileByUserId(user.id);
    if (!profile) {
      return NextResponse.json({ success: false, error: "Partner profili bulunamadı" }, { status: 404 });
    }

    const settings = await getPartnerPayoutSettings(profile.id);
    return NextResponse.json({ success: true, data: settings });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ayarlar alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

    const profile = await getPartnerProfileByUserId(user.id);
    if (!profile) {
      return NextResponse.json({ success: false, error: "Partner profili bulunamadı" }, { status: 404 });
    }

    const body = (await req.json()) as {
      iban?: string;
      accountHolder?: string;
      taxIdentityNumber?: string;
    };

    const settings = await updatePartnerPayoutSettings(profile.id, {
      iban: body.iban,
      accountHolder: body.accountHolder,
      taxIdentityNumber: body.taxIdentityNumber,
    });

    return NextResponse.json({ success: true, data: settings, message: "Partner ödeme bilgileri kaydedildi" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kayıt başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
