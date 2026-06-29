import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  findProductDuplicateConflicts,
  saveAdminProductGraph,
  validateAdminProductPayload,
} from "@/lib/products/admin-product-persist";

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
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
