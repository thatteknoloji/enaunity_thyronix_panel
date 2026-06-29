import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  findProductDuplicateConflicts,
  saveAdminProductGraph,
  validateAdminProductPayload,
} from "@/lib/products/admin-product-persist";

export async function GET() {
  try {
    await requireAdmin();
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { variants: true } } },
    });
    return NextResponse.json({ success: true, data: products });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const data = (await req.json()) as Record<string, unknown>;
    const { payload, errors } = validateAdminProductPayload(data);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors[0], errors }, { status: 400 });
    }

    const conflicts = await findProductDuplicateConflicts({
      sku: payload.sku,
      barcode: payload.barcode,
      modelCode: payload.modelCode,
      variants: payload.variants.map((variant) => ({
        sku: variant.sku,
        barcode: variant.barcode,
      })),
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        { success: false, error: "Aynı SKU / barkod / model kodu başka kayıtta kullanılıyor.", conflicts },
        { status: 409 },
      );
    }

    const product = await saveAdminProductGraph(payload);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 },
    );
  }
}
