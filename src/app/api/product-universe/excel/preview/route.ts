import { NextResponse } from "next/server";
import { handleProductUniverseImportPreview } from "@/lib/product-universe/import-preview-handler";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

export async function POST(req: Request) {
  try {
    return await handleProductUniverseImportPreview(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Preview başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
