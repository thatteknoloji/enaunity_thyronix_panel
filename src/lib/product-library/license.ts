import { prisma } from "@/lib/db";
import { LICENSE_LEVELS, type LicenseLevel } from "./types";

const MODULE_KEY = "PRODUCT_LIBRARY";

export function normalizeLicenseLevel(raw?: string | null): LicenseLevel {
  const k = (raw || "FREE").toUpperCase();
  if (k.includes("ENTERPRISE") || k.includes("ENT")) return "ENTERPRISE";
  if (k.includes("PRO")) return "PRO";
  if (k.includes("STARTER") || k.includes("START")) return "STARTER";
  return "FREE";
}

export function levelsAllowedForDealer(tier: LicenseLevel): LicenseLevel[] {
  const idx = LICENSE_LEVELS.indexOf(tier);
  if (idx < 0) return ["FREE"];
  return LICENSE_LEVELS.slice(0, idx + 1) as LicenseLevel[];
}

export function canAccessPackageLevel(dealerTier: LicenseLevel, packageLevel: LicenseLevel): boolean {
  return levelsAllowedForDealer(dealerTier).includes(packageLevel);
}

export async function getDealerLibraryTier(dealerId: string): Promise<LicenseLevel> {
  const license = await prisma.moduleLicense.findFirst({
    where: { dealerId, moduleKey: MODULE_KEY, status: { in: ["ACTIVE", "TRIAL"] } },
    orderBy: { updatedAt: "desc" },
  });
  if (!license) return "FREE";
  return normalizeLicenseLevel(license.planKey);
}
