import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  findProductDuplicateConflicts,
  saveAdminProductGraph,
  validateAdminProductPayload,
} from "@/lib/products/admin-product-persist";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        digitalLicensePoolItems: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    const activeCodes = product.digitalLicensePoolItems
      .filter((item) => item.status !== "archived")
      .map((item) => item.code);

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        digitalLicensePoolBulk: activeCodes.join("\n"),
        digitalLicensePoolSummary: {
          total: product.digitalLicensePoolItems.length,
          available: product.digitalLicensePoolItems.filter((item) => item.status === "available").length,
          assigned: product.digitalLicensePoolItems.filter((item) => item.status === "assigned").length,
          archived: product.digitalLicensePoolItems.filter((item) => item.status === "archived").length,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = (await req.json()) as Record<string, unknown>;
    const { payload, errors } = validateAdminProductPayload(data);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors[0], errors }, { status: 400 });
    }

    const conflicts = await findProductDuplicateConflicts(
      {
        sku: payload.sku,
        barcode: payload.barcode,
        modelCode: payload.modelCode,
        variants: payload.variants.map((variant) => ({
          sku: variant.sku,
          barcode: variant.barcode,
        })),
      },
      id,
    );

    if (conflicts.length > 0) {
      return NextResponse.json(
        { success: false, error: "Aynı SKU / barkod / model kodu başka kayıtta kullanılıyor.", conflicts },
        { status: 409 },
      );
    }

    const product = await saveAdminProductGraph(payload, { productId: id });
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const blockerCounts = await prisma.product.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            orderItems: true,
            stockMovements: true,
            warehouseStocks: true,
            quoteItems: true,
            returnItems: true,
            bundleItems: true,
            stockCountItems: true,
          },
        },
      },
    });

    if (!blockerCounts) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    const blockers = [
      { key: "orderItems", label: "sipariş kalemi", count: blockerCounts._count.orderItems },
      { key: "stockMovements", label: "stok hareketi", count: blockerCounts._count.stockMovements },
      { key: "warehouseStocks", label: "depo stoku", count: blockerCounts._count.warehouseStocks },
      { key: "quoteItems", label: "teklif satırı", count: blockerCounts._count.quoteItems },
      { key: "returnItems", label: "iade kalemi", count: blockerCounts._count.returnItems },
      { key: "bundleItems", label: "bundle bağı", count: blockerCounts._count.bundleItems },
      { key: "stockCountItems", label: "stok sayım kaydı", count: blockerCounts._count.stockCountItems },
    ].filter((item) => item.count > 0);

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Ürün geçmiş işlemlere bağlı olduğu için silinemiyor.",
          blockers,
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.campaignProduct.deleteMany({ where: { productId: id } });
      await tx.tieredPrice.deleteMany({ where: { productId: id } });
      await tx.dealerPrice.deleteMany({ where: { productId: id } });
      await tx.priceList.deleteMany({ where: { productId: id } });
      await tx.catalogRestriction.deleteMany({ where: { productId: id } });
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.favoriteProduct.deleteMany({ where: { productId: id } });
      await tx.savedCartItem.deleteMany({ where: { productId: id } });
      await tx.review.deleteMany({ where: { productId: id } });
      await tx.shippingConfig.deleteMany({ where: { productId: id } });
      await tx.variant.deleteMany({ where: { productId: id } });
      await tx.variantGroup.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
