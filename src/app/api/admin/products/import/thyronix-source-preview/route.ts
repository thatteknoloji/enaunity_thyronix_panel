import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createThyronixSourceImportPreview } from "@/lib/products/marketplace-import/thyronix-source";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { sourceId } = await req.json();
    if (!sourceId) {
      return NextResponse.json({ success: false, error: "sourceId gerekli" }, { status: 400 });
    }

    const preview = await createThyronixSourceImportPreview(sourceId);
    return NextResponse.json({
      success: true,
      data: {
        ...preview,
        groups: preview.groups.slice(0, 50).map((group) => ({
          modelCode: group.modelCode,
          name: group.name,
          description: group.description.slice(0, 200),
          brand: group.brand,
          category: group.category,
          variantCount: group.rows.length,
          price: group.price,
          stock: group.stock,
          errors: group.errors.slice(0, 5),
          warnings: group.warnings.slice(0, 5),
          sampleVariants: group.rows.slice(0, 3).map((row) => ({
            sku: row.sku,
            barcode: row.barcode,
            price: row.price,
            stock: row.stock,
            options: row.variantOptions,
          })),
        })),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Thyronix önizleme hatası" },
      { status: 500 },
    );
  }
}
