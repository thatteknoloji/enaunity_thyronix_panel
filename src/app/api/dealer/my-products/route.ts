import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import {
  createDealerProduct,
  deleteDealerProduct,
  listDealerProducts,
  updateDealerProduct,
} from "@/lib/dealer-products/service";

export async function GET() {
  try {
    const user = await requireDealer();
    if (!user.dealerId) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 403 });
    }
    const products = await listDealerProducts(user.dealerId, false);
    return NextResponse.json({ success: true, data: products });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    if (!user.dealerId) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 403 });
    }
    const body = await req.json();
    const product = await createDealerProduct(user.dealerId, body);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireDealer();
    if (!user.dealerId) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 403 });
    }
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: "id gerekli" }, { status: 400 });
    const product = await updateDealerProduct(user.dealerId, body.id, body);
    return NextResponse.json({ success: true, data: product });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireDealer();
    if (!user.dealerId) {
      return NextResponse.json({ success: false, error: "Bayi hesabı gerekli" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ success: false, error: "id gerekli" }, { status: 400 });
    const result = await deleteDealerProduct(user.dealerId, id);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
