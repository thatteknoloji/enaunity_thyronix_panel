import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { loadAdminAnalysisProducts } from "@/lib/dealer/analysis-product-feed";
import {
  THYRONIX_CARGO_PRESETS,
  THYRONIX_MARKETPLACE_PRESETS,
} from "@/lib/thyronix/analysis-presets";

export async function GET() {
  try {
    await requireAdmin();
    const { products, sourceCounts } = await loadAdminAnalysisProducts();

    return NextResponse.json({
      success: true,
      data: {
        marketplaces: THYRONIX_MARKETPLACE_PRESETS,
        cargoes: THYRONIX_CARGO_PRESETS,
        products,
        sourceCounts,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
