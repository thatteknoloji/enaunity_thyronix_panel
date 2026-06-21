import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { submitPartnerApplication } from "@/lib/partners/applications";
import { getPartnerApplyContext, resolveModuleIntentPath } from "@/lib/partners/apply-context";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

    const ctx = await getPartnerApplyContext(user.id, user.dealerId);
    return NextResponse.json({ success: true, data: ctx });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Başvuru bilgisi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

    const body = (await req.json()) as {
      fullName?: string;
      companyName?: string;
      email?: string;
      phone?: string;
      requestedType?: string;
      hasTaxPlate?: boolean;
      socialMedia?: string;
      applicationNote?: string;
      intent?: "partner" | "module";
    };

    const ctx = await getPartnerApplyContext(user.id, user.dealerId);

    if (body.requestedType === "POD_CREATOR" || body.intent === "module") {
      const redirectTo = body.requestedType
        ? resolveModuleIntentPath(body.requestedType, ctx)
        : "/dealer/modules";
      return NextResponse.json({
        success: true,
        redirectTo: redirectTo || "/dealer/modules",
        message: "Modül lisansı için yönlendiriliyorsunuz",
      });
    }

    const prefill = ctx.prefill;
    const fullName = (body.fullName || prefill.fullName).trim();
    const requestedType = body.requestedType || ctx.suggestedPartnerType;

    if (!fullName || !requestedType) {
      return NextResponse.json({ success: false, error: "Partner tipi zorunlu" }, { status: 400 });
    }

    const app = await submitPartnerApplication({
      userId: user.id,
      dealerId: user.dealerId,
      fullName,
      companyName: body.companyName || prefill.companyName,
      email: (body.email || prefill.email || user.email).toLowerCase(),
      phone: body.phone || prefill.phone,
      requestedType,
      hasTaxPlate: body.hasTaxPlate ?? prefill.hasTaxPlate,
      socialMedia: body.socialMedia || prefill.socialMedia,
      applicationNote: body.applicationNote,
    });

    const fastTrack = app.status === "APPROVED";

    return NextResponse.json({
      success: true,
      data: app,
      fastTrack,
      message: fastTrack
        ? "Partner profiliniz aktifleştirildi. Partner Merkezi'ne yönlendiriliyorsunuz."
        : "Partner başvurunuz alındı. Admin onayı sonrası Partner Merkezi aktif olacaktır.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Başvuru başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
