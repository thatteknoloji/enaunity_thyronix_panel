import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listAllLinks, relinkProductAccount, updateLinkStatus } from "@/lib/product-links/service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const links = await listAllLinks({
      productType: searchParams.get("productType") || undefined,
      status: searchParams.get("status") || undefined,
    });
    return NextResponse.json({ success: true, data: links });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 403 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { linkId, action } = body;

    if (!linkId) {
      return NextResponse.json({ success: false, error: "linkId gerekli" }, { status: 400 });
    }

    if (action === "disable") {
      const link = await updateLinkStatus(linkId, "DISABLED", admin);
      return NextResponse.json({ success: true, data: link });
    }

    if (action === "enable") {
      const link = await updateLinkStatus(linkId, "LINKED", admin);
      return NextResponse.json({ success: true, data: link });
    }

    if (action === "relink" || action === "force_relink") {
      const result = await relinkProductAccount(linkId, admin, { force: true });
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "delete") {
      const link = await updateLinkStatus(linkId, "DELETED", admin);
      return NextResponse.json({ success: true, data: link });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 400 }
    );
  }
}
