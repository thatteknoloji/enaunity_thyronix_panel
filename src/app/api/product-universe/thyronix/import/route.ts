import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runThyronixBridgeImport } from "@/lib/product-universe/thyronix-bridge";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const sourceIds = Array.isArray(body.sourceIds)
      ? body.sourceIds.map(String).filter(Boolean)
      : undefined;
    const dryRun = body.dryRun === true;

    if (!dryRun && body.manualBridgeConfirm !== "ENA_ADMIN_MANUAL_IMPORT") {
      return NextResponse.json(
        {
          success: false,
          error: "THYRONIX bağımsızdır. Gerçek aktarım için manuel admin import onayı gerekir.",
        },
        { status: 400 },
      );
    }

    const result = await runThyronixBridgeImport({
      sourceIds,
      onlyActiveSources: body.onlyActiveSources !== false,
      dryRun,
      limit: body.limit != null ? Number(body.limit) : 1000,
      minStock: body.minStock != null ? Number(body.minStock) : 0,
      analyze: body.analyze !== false,
      cursor: body.cursor ? String(body.cursor) : null,
      dealerId: null,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Thyronix bridge import başarısız";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
