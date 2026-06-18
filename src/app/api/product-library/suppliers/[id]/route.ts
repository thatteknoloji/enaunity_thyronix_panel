import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { runXmlImport } from "@/lib/product-library/import-xml";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const field of [
      "name", "type", "contactName", "contactEmail", "xmlUrl", "notes", "catalogId", "status",
    ] as const) {
      if (body[field] !== undefined) {
        data[field] = body[field] === "" && field === "catalogId" ? null : body[field];
      }
    }
    const supplier = await prisma.productSupplier.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: supplier });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const supplier = await prisma.productSupplier.findUnique({ where: { id } });
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Tedarikçi bulunamadı" }, { status: 404 });
    }
    if (!supplier.xmlUrl?.trim()) {
      return NextResponse.json({ success: false, error: "XML URL tanımlı değil" }, { status: 400 });
    }
    if (!supplier.catalogId) {
      return NextResponse.json({ success: false, error: "Tedarikçiye katalog bağlanmamış" }, { status: 400 });
    }

    const result = await runXmlImport({
      catalogId: supplier.catalogId,
      supplierId: supplier.id,
      sourceUrl: supplier.xmlUrl,
      createdBy: user.email,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
