export type WarehouseEngine = "core" | "dealer_warehouse";

export const CORE_MOVEMENT_TYPES = [
  "IN",
  "OUT",
  "RESERVE",
  "RELEASE_RESERVE",
  "RETURN",
  "ADJUSTMENT",
  "TRANSFER",
] as const;

export type CoreMovementType = (typeof CORE_MOVEMENT_TYPES)[number];

export function getWarehouseEngine(): WarehouseEngine {
  const engine = (process.env.WAREHOUSE_ENGINE || "core").toLowerCase();
  return engine === "dealer_warehouse" ? "dealer_warehouse" : "core";
}

export function isCoreWarehouseEngine(): boolean {
  return getWarehouseEngine() === "core";
}

export function isLegacyDealerWarehouseEnabled(): boolean {
  if (process.env.LEGACY_DEALER_WAREHOUSE_ENABLED === "true") return true;
  if (process.env.LEGACY_DEALER_WAREHOUSE_ENABLED === "false") return false;
  return getWarehouseEngine() === "dealer_warehouse";
}

export function isDealerWarehouseMirrorEnabled(): boolean {
  return process.env.DEALER_WAREHOUSE_MIRROR_ENABLED === "true";
}

export function normalizeMovementType(type: string): CoreMovementType | string {
  const map: Record<string, CoreMovementType> = {
    entry: "IN",
    exit: "OUT",
    adjustment: "ADJUSTMENT",
    return: "RETURN",
    reserve: "RESERVE",
    release_reserve: "RELEASE_RESERVE",
    transfer: "TRANSFER",
  };
  const upper = type.toUpperCase();
  if (CORE_MOVEMENT_TYPES.includes(upper as CoreMovementType)) return upper as CoreMovementType;
  return map[type.toLowerCase()] || type;
}

export const RESERVE_TYPES = ["RESERVE", "reserve"];
export const RELEASE_TYPES = ["RELEASE_RESERVE", "release_reserve"];
export const OUT_TYPES = ["OUT", "exit"];
export const IN_TYPES = ["IN", "entry"];
export const RETURN_TYPES = ["RETURN", "return"];
