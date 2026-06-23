import { NextResponse } from "next/server";
import {
  listImportTemplates,
  saveImportTemplate,
} from "@/lib/product-universe/import-service";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

/** Canonical: excel/templates — legacy alias: /api/product-universe/import/templates */
export async function GET() {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const items = await listImportTemplates(guard.dealerId);
    return NextResponse.json({ success: true, data: items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Şablonlar alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const body = await req.json();
    const name = String(body.name || "").trim();
    const sourceType = String(body.sourceType || "CSV");
    const mapping = body.mapping;

    if (!name) {
      return NextResponse.json({ success: false, error: "Şablon adı gerekli" }, { status: 400 });
    }

    const item = await saveImportTemplate({
      dealerId: guard.dealerId,
      name,
      sourceType,
      mappingJson: JSON.stringify(mapping || {}),
    });

    return NextResponse.json({ success: true, data: item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Şablon kaydedilemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
