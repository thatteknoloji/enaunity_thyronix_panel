import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { findProductDuplicateConflicts } from "@/lib/products/admin-product-persist";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as {
      productId?: string;
      sku?: string;
      barcode?: string;
      modelCode?: string;
      variants?: Array<{ sku?: string; barcode?: string }>;
    };

    const conflicts = await findProductDuplicateConflicts(
      {
        sku: body.sku,
        barcode: body.barcode,
        modelCode: body.modelCode,
        variants: Array.isArray(body.variants) ? body.variants : [],
      },
      body.productId || undefined,
    );

    return NextResponse.json({
      success: true,
      data: {
        conflicts,
        hasConflicts: conflicts.length > 0,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
