import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getOperasyonOrderDetail,
  advanceOperasyonOrder,
  setOperasyonTracking,
  attachOperasyonShippingLabel,
  fetchOperasyonLabelFromTrendyol,
} from "@/lib/fulfillment/operasyon-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const order = await getOperasyonOrderDetail(id);
    if (!order) return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    if (body.action === "advance") {
      const order = await advanceOperasyonOrder(id, admin.id);
      return NextResponse.json({ success: true, data: order });
    }

    if (body.action === "tracking") {
      const order = await setOperasyonTracking(id, {
        trackingNumber: body.trackingNumber,
        cargoCompany: body.cargoCompany,
      });
      return NextResponse.json({ success: true, data: order });
    }

    if (body.action === "shipping_label") {
      if (!body.fileUrl) {
        return NextResponse.json({ success: false, error: "fileUrl gerekli" }, { status: 400 });
      }
      const order = await attachOperasyonShippingLabel(id, {
        fileUrl: body.fileUrl,
        fileName: body.fileName || "kargo-etiketi.pdf",
        fileSize: body.fileSize,
      });
      return NextResponse.json({ success: true, data: order });
    }

    if (body.action === "fetch_ty_label") {
      const order = await fetchOperasyonLabelFromTrendyol(id);
      return NextResponse.json({ success: true, data: order });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
