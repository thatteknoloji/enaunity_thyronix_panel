import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { relinkProductAccount } from "@/lib/product-links/service";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum bulunamadı" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.linkId) {
      return NextResponse.json({ success: false, error: "linkId gerekli" }, { status: 400 });
    }

    const result = await relinkProductAccount(body.linkId, user, { force: body.force === true });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 400 }
    );
  }
}
