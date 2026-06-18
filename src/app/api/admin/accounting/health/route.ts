import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { findBalanceDivergences } from "@/lib/accounting/accounting-service";
import { getAccountingEngine, isDealerAccountEngine } from "@/lib/accounting/config";

export async function GET() {
  try {
    await requireAdmin();
    const divergences = await findBalanceDivergences(20);

    return NextResponse.json({
      success: true,
      data: {
        engine: getAccountingEngine(),
        dealerAccountEngine: isDealerAccountEngine(),
        divergenceCount: divergences.length,
        divergences,
        hasDivergence: divergences.length > 0,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
