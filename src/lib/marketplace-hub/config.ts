export type MarketplaceEngine = "hub" | "legacy";

export function getMarketplaceEngine(): MarketplaceEngine {
  const engine = (process.env.MARKETPLACE_ENGINE || "hub").toLowerCase();
  return engine === "legacy" ? "legacy" : "hub";
}

export function isHubEngine(): boolean {
  return getMarketplaceEngine() === "hub";
}

export function isLegacyMarketplaceEnabled(): boolean {
  if (process.env.LEGACY_MARKETPLACE_ENABLED === "true") return true;
  if (process.env.LEGACY_MARKETPLACE_ENABLED === "false") return false;
  return getMarketplaceEngine() === "legacy";
}

/** Client-safe check (NEXT_PUBLIC mirror). */
export function isLegacyMarketplaceEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_LEGACY_MARKETPLACE_ENABLED === "true";
}

export function isDevOrTestMode(): boolean {
  if (process.env.MARKETPLACE_ALLOW_MOCK === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export const HUB_MARKETPLACE_SOURCE = "MARKETPLACE_HUB" as const;

export function buildConvergenceMetadata(extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    sourceSystem: HUB_MARKETPLACE_SOURCE,
    futureUnifiedOrderReady: true,
    engine: getMarketplaceEngine(),
    ...extra,
  });
}
