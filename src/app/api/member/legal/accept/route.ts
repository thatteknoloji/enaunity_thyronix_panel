import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordLegalAcceptance } from "@/lib/legal/acceptance";
import { getRequestMetaFromRequest } from "@/lib/legal/request-meta";
import type { LegalContext } from "@/lib/legal/constants";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Giriş gerekli" }, { status: 401 });

    const body = await req.json();
    const slug = String(body.slug || "");
    const context = (body.context || "reconsent") as LegalContext;
    if (!slug) return NextResponse.json({ success: false, error: "Sözleşme gerekli" }, { status: 400 });

    const meta = getRequestMetaFromRequest(req);
    const acceptance = await recordLegalAcceptance({
      slug,
      userId: user.id,
      email: user.email,
      dealerId: user.dealerId,
      context,
      optional: !!body.optional,
      meta,
    });

    return NextResponse.json({ success: true, data: acceptance });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Onay kaydedilemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
