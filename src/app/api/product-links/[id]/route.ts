import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteProductLink, getLinkById, updateLinkStatus } from "@/lib/product-links/service";
import { isAdminRole } from "@/lib/auth/admin-access";
import { LINK_STATUSES, type LinkStatus } from "@/lib/product-links/types";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum bulunamadı" }, { status: 401 });
    }

    const { id } = await params;
    const link = await deleteProductLink(id, user);
    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum bulunamadı" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const action = body.action as string;

    if (action === "disable") {
      const link = await updateLinkStatus(id, "DISABLED", user);
      return NextResponse.json({ success: true, data: link });
    }

    if (action === "enable") {
      const link = await updateLinkStatus(id, "LINKED", user);
      return NextResponse.json({ success: true, data: link });
    }

    if (action === "relink") {
      const existing = await getLinkById(id);
      if (!existing) {
        return NextResponse.json({ success: false, error: "Bağlantı bulunamadı" }, { status: 404 });
      }
      if (!isAdminRole(user.role) && existing.enaUserId !== user.id) {
        return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 403 });
      }
      const { relinkProductAccount } = await import("@/lib/product-links/service");
      const result = await relinkProductAccount(id, user, { force: true });
      return NextResponse.json({ success: true, data: result });
    }

    if (body.status && LINK_STATUSES.includes(body.status as LinkStatus)) {
      const link = await updateLinkStatus(id, body.status as LinkStatus, user);
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
