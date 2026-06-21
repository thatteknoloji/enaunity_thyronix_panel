import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { submitPartnerApplication } from "@/lib/partners/applications";

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
    };

    if (!body.fullName || !body.requestedType) {
      return NextResponse.json({ success: false, error: "Ad ve partner tipi zorunlu" }, { status: 400 });
    }

    const app = await submitPartnerApplication({
      userId: user.id,
      dealerId: user.dealerId,
      fullName: body.fullName,
      companyName: body.companyName,
      email: (body.email || user.email).toLowerCase(),
      phone: body.phone || "",
      requestedType: body.requestedType,
      hasTaxPlate: body.hasTaxPlate,
      socialMedia: body.socialMedia,
      applicationNote: body.applicationNote,
    });

    return NextResponse.json({
      success: true,
      data: app,
      message: "Partner başvurunuz alındı. Admin onayı sonrası Partner Merkezi aktif olacaktır.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Başvuru başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
