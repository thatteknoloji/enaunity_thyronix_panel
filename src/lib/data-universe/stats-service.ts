import { prisma } from "@/lib/db";
import { getGeoStats } from "./geo-service";

export type DataUniverseAdminStats = {
  countries: number;
  provinces: number;
  districts: number;
  neighborhoods: number;
  villages: number;
  streets: number;
  industries: number;
  categories: number;
  intents: number;
  patterns: number;
  importJobs: number;
};

export async function getDataUniverseAdminStats(): Promise<DataUniverseAdminStats> {
  const [geo, industries, categories, intents, patterns, importJobs] = await Promise.all([
    getGeoStats(),
    prisma.industry.count(),
    prisma.industryCategory.count(),
    prisma.searchIntent.count(),
    prisma.questionPattern.count(),
    prisma.dataUniverseImportJob.count(),
  ]);
  return {
    ...geo,
    industries,
    categories,
    intents,
    patterns,
    importJobs,
  };
}
