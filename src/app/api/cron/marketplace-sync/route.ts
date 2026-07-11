import { NextResponse } from "next/server";
import { getMarketplaceEngine, isLegacyMarketplaceEnabled } from "@/lib/marketplace-hub/config";
import { logLegacySyncSkipped } from "@/lib/marketplace-hub/legacy-guard";
import { syncAllConnections, summarizeSyncResults } from "@/lib/marketplace-hub/sync";
import { syncAllMarketplaceConnections } from "@/lib/marketplaces/sync-engine";

export async function GET() {
  try {
    const engine = getMarketplaceEngine();
    const legacyEnabled = isLegacyMarketplaceEnabled();

    if (engine === "hub" || !legacyEnabled) {
      const results = await syncAllConnections();
      const summary = summarizeSyncResults(results);

      if (!legacyEnabled) {
        await logLegacySyncSkipped();
      }

      return NextResponse.json({
        success: true,
        data: {
          engine: "hub",
          legacySkipped: !legacyEnabled,
          syncedConnections: summary.syncedConnections,
          importedOrders: summary.importedOrders,
          newOrders: summary.newOrders,
          updatedOrders: summary.updatedOrders,
          errorCount: summary.errorCount,
          results,
        },
      });
    }

    const legacy = await syncAllMarketplaceConnections();
    return NextResponse.json({
      success: true,
      data: {
        engine: "legacy",
        legacySkipped: false,
        syncedConnections: legacy.connections,
        importedOrders: legacy.totalProcessed,
        legacy,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sync hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
