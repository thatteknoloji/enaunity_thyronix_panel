import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { productCatalogItemId, dealerPrice } = body;

    if (!productCatalogItemId) {
      return NextResponse.json({ success: false, error: "Ürün ID gerekli" }, { status: 400 });
    }

    const store = await prisma.dealerStore.findUnique({ where: { id } });
    if (!store) return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });

    const existing = await prisma.storeProduct.findUnique({
      where: { storeId_productCatalogItemId: { storeId: id, productCatalogItemId } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu ürün zaten mağazada" }, { status: 400 });
    }

    const maxSort = await prisma.storeProduct.findFirst({
      where: { storeId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const product = await prisma.storeProduct.create({
      data: {
        storeId: id,
        productCatalogItemId,
        dealerPrice: dealerPrice || 0,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    if (!body.productId) {
      return NextResponse.json({ success: false, error: "productId gerekli" }, { status: 400 });
    }
    const product = await prisma.storeProduct.findFirst({ where: { id: body.productId, storeId: id } });
    if (!product) return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    await prisma.storeProduct.delete({ where: { id: body.productId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    if (!body.productId) {
      return NextResponse.json({ success: false, error: "productId gerekli" }, { status: 400 });
    }
    const product = await prisma.storeProduct.findFirst({ where: { id: body.productId, storeId: id } });
    if (!product) return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    const data: Record<string, unknown> = {};
    if (body.dealerPrice !== undefined) data.dealerPrice = body.dealerPrice;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    const updated = await prisma.storeProduct.update({ where: { id: body.productId }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
