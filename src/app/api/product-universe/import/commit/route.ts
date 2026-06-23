import { NextResponse } from "next/server";
import { handleProductUniverseImportCommit } from "@/lib/product-universe/import-commit-handler";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

/**
 * @deprecated Backward-compatible wrapper — canonical route: POST /api/product-universe/excel/commit
 * Handler: handleProductUniverseImportCommit (shared)
 */
export async function POST(req: Request) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;
    return await handleProductUniverseImportCommit(req, {
      dealerId: guard.dealerId,
      isAdmin: guard.isAdmin,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
