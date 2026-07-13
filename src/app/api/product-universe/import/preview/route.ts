import { NextResponse } from "next/server";
import { handleProductUniverseImportPreview } from "@/lib/product-universe/import-preview-handler";

/**
 * @deprecated Backward-compatible wrapper — canonical route: POST /api/product-universe/excel/preview
 * Handler: handleProductUniverseImportPreview (shared)
 */
export async function POST(req: Request) {
  try {
    return await handleProductUniverseImportPreview(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Preview başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
