import { prisma } from "@/lib/db";
import { getGeoStats, queryGeoTree } from "@/lib/data-universe/geo-service";
import {
  listIndustries,
  listSearchIntents,
  listQuestionPatterns,
} from "@/lib/data-universe/reference-service";
import { getHiveWorkspaceForUser, DEFAULT_HIVE_SETTINGS } from "./integration";
import type { User } from "@/types";

export type HiveGeoSettings = {
  geoEnabled: boolean;
  dataUniverseVersion: string;
};

const DATA_UNIVERSE_VERSION = "1.5";

function parseWorkspaceSettings(settingsJson: string | null | undefined): Record<string, unknown> {
  if (!settingsJson) return { ...DEFAULT_HIVE_SETTINGS };
  try {
    return { ...DEFAULT_HIVE_SETTINGS, ...(JSON.parse(settingsJson) as Record<string, unknown>) };
  } catch {
    return { ...DEFAULT_HIVE_SETTINGS };
  }
}

export async function getHiveGeoSettings(user: User): Promise<HiveGeoSettings> {
  const workspace = await getHiveWorkspaceForUser(user);
  const settings = parseWorkspaceSettings(workspace?.settingsJson);
  const geoEnabled = settings.geoEnabled !== false;
  return { geoEnabled, dataUniverseVersion: DATA_UNIVERSE_VERSION };
}

export async function assertHiveGeoAccess(user: User) {
  const { geoEnabled } = await getHiveGeoSettings(user);
  if (!geoEnabled) {
    throw new Error("HIVE GEO Engine devre dışı");
  }
  const stats = await getGeoStats();
  if (stats.provinces < 1) {
    throw new Error("GEO veri evreni henüz yüklenmedi");
  }
  return stats;
}

/** HIVE GEO API — Data Universe paylaşımlı katman */
export async function queryHiveGeo(user: User, searchParams: URLSearchParams) {
  await assertHiveGeoAccess(user);
  return queryGeoTree(searchParams);
}

export async function getHiveGeoOverview(user: User) {
  const stats = await assertHiveGeoAccess(user);
  const [industries, intents, patterns] = await Promise.all([
    prisma.industry.count({ where: { isActive: true } }),
    prisma.searchIntent.count({ where: { isActive: true } }),
    prisma.questionPattern.count({ where: { isActive: true } }),
  ]);
  return {
    ...stats,
    industries,
    intents,
    patterns,
    dataUniverseVersion: DATA_UNIVERSE_VERSION,
    source: "data-universe-engine",
  };
}

export async function queryHiveReference(user: User, type: "industries" | "intents" | "patterns", searchParams: URLSearchParams) {
  await assertHiveGeoAccess(user);
  switch (type) {
    case "industries":
      return listIndustries(searchParams);
    case "intents":
      return listSearchIntents(searchParams);
    case "patterns":
      return listQuestionPatterns(searchParams);
  }
}

// Re-export for direct service use in HIVE modules
export { queryGeoTree, getGeoStats, listIndustries, listSearchIntents, listQuestionPatterns };
