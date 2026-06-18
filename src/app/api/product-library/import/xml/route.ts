import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runXmlImport, testXmlUrl } from "@/lib/product-library/import-xml";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/product-library/types";
import { ensureUniqueSlug } from "@/lib/product-library/access";

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const { action, xmlUrl, name, category, catalogId, supplierId, supplierName, testOnly } = body;

    if (action === "test" || testOnly) {
      if (!xmlUrl) return NextResponse.json({ success: false, error: "XML URL zorunlu" }, { status: 400 });
      const result = await testXmlUrl(xmlUrl);
      return NextResponse.json({ success: true, data: result });
    }

    let resolvedCatalogId = catalogId;
    if (!resolvedCatalogId && category) {
      const slug = await ensureUniqueSlug(slugify(category), "catalog");
      const cat = await prisma.productCatalog.create({
        data: { name: category, slug, status: "ACTIVE" },
      });
      resolvedCatalogId = cat.id;
    }
    if (!resolvedCatalogId) {
      return NextResponse.json({ success: false, error: "Katalog seçimi zorunlu" }, { status: 400 });
    }

    let resolvedSupplierId = supplierId;
    if (!resolvedSupplierId && (supplierName || name)) {
      const sName = supplierName || name;
      const slug = await ensureUniqueSlug(slugify(sName), "supplier");
      const sup = await prisma.productSupplier.create({
        data: {
          name: sName,
          slug,
          type: "XML",
          xmlUrl: xmlUrl || "",
          catalogId: resolvedCatalogId,
        },
      });
      resolvedSupplierId = sup.id;
    }

    if (!xmlUrl) {
      return NextResponse.json({ success: false, error: "XML URL zorunlu" }, { status: 400 });
    }

    const result = await runXmlImport({
      catalogId: resolvedCatalogId,
      supplierId: resolvedSupplierId,
      sourceUrl: xmlUrl,
      createdBy: user.email,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
