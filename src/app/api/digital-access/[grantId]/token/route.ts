import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createDigitalAccessToken } from "@/lib/products/digital-access";

type Params = { params: Promise<{ grantId: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum gerekli" }, { status: 401 });
    }

    const { grantId } = await params;
    const result = await createDigitalAccessToken(grantId, user);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Güvenli erişim linki oluşturulamadı";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
