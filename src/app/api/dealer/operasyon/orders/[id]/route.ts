import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import {
  advanceOperasyonOrder,
  attachOperasyonShippingLabel,
  fetchOperasyonLabelFromTrendyol,
  getOperasyonOrderDetail,
  refreshOperasyonOrderFromTrendyol,
  setOperasyonTracking,
} from "@/lib/fulfillment/operasyon-service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const body = await req.json();
    const action = String(body.action || "");

    const detail = await getOperasyonOrderDetail(id, user.dealerId!);
    if (!detail) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }

    if (action === "advance") {
      const updated = await advanceOperasyonOrder(id, "dealer");
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "tracking") {
      const updated = await setOperasyonTracking(id, {
        trackingNumber: body.trackingNumber ? String(body.trackingNumber) : undefined,
        cargoCompany: body.cargoCompany ? String(body.cargoCompany) : undefined,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "shipping_label") {
      const fileUrl = String(body.fileUrl || "");
      const fileName = String(body.fileName || "");
      if (!fileUrl || !fileName) {
        return NextResponse.json({ success: false, error: "Dosya URL ve adı zorunlu" }, { status: 400 });
      }
      const updated = await attachOperasyonShippingLabel(id, {
        fileUrl,
        fileName,
        fileSize: Number(body.fileSize || 0) || 0,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "fetch_ty_label") {
      const updated = await fetchOperasyonLabelFromTrendyol(id);
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "refresh_ty_order") {
      const updated = await refreshOperasyonOrderFromTrendyol(id);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
