import { NextResponse } from "next/server";
import { generateImportTemplateBuffer } from "@/lib/product-universe/import-service";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

export async function GET() {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const buffer = generateImportTemplateBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="product-universe-import-template.xlsx"',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Şablon indirilemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
