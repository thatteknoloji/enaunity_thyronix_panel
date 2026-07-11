import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMarketplaceEngine, isLegacyMarketplaceEnabled } from "./config";

const DESTRUCTIVE_ACTIONS = new Set([
  "sync",
  "create",
  "update",
  "toggle",
  "delete",
  "saveTelegram",
]);

export function legacyMarketplaceDisabledResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Legacy marketplace devre dışı. Marketplace Hub kullanın.",
      code: "LEGACY_MARKETPLACE_DISABLED",
      redirectTo: "/admin/marketplace-hub",
      engine: getMarketplaceEngine(),
    },
    { status: 410 }
  );
}

export function isDestructiveLegacyAction(action: string | undefined): boolean {
  return !!action && DESTRUCTIVE_ACTIONS.has(action);
}

export function guardLegacyWrite(action: string | undefined) {
  if (!isLegacyMarketplaceEnabled() && isDestructiveLegacyAction(action)) {
    return legacyMarketplaceDisabledResponse();
  }
  return null;
}

/** Log when legacy sync would have run but is disabled. */
export async function logLegacySyncSkipped(connectionId?: string) {
  const connections = connectionId
    ? await prisma.marketplaceConnection.findMany({ where: { id: connectionId } })
    : await prisma.marketplaceConnection.findMany({ where: { active: true }, take: 50 });

  const targets = connections.length ? connections : [{ id: "system", platform: "SYSTEM" } as { id: string; platform: string }];

  for (const conn of targets) {
    if (conn.id === "system") continue;
    await prisma.marketplaceSyncLog.create({
      data: {
        connectionId: conn.id,
        marketplace: (conn.platform || "SYSTEM").toUpperCase(),
        status: "SKIPPED",
        completedAt: new Date(),
        errorMessage: "LEGACY_DISABLED",
        detailsJson: JSON.stringify({
          reason: "LEGACY_DISABLED",
          engine: getMarketplaceEngine(),
          legacyEnabled: false,
        }),
      },
    });
  }
}
