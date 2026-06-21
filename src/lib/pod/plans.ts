import { prisma } from "@/lib/db";

export type PodPlanLimits = {
  maxDesigns: number;
  maxProducts: number;
  maxMockups: number;
  isPublic?: boolean;
  adminOnly?: boolean;
  billingPeriod?: string;
};

export function parsePodPlanLimits(limitsJson: string | null | undefined): PodPlanLimits {
  try {
    const raw = JSON.parse(limitsJson || "{}") as Partial<PodPlanLimits>;
    return {
      maxDesigns: raw.maxDesigns ?? 0,
      maxProducts: raw.maxProducts ?? 0,
      maxMockups: raw.maxMockups ?? 0,
      isPublic: raw.isPublic ?? true,
      adminOnly: raw.adminOnly ?? false,
      billingPeriod: raw.billingPeriod ?? "monthly",
    };
  } catch {
    return { maxDesigns: 0, maxProducts: 0, maxMockups: 0, isPublic: true, billingPeriod: "monthly" };
  }
}

export async function getPodPlan(planKey: string) {
  return prisma.modulePlan.findFirst({
    where: { moduleKey: "POD_CREATOR", planKey },
  });
}

export async function getPublicPodPlans() {
  const plans = await prisma.modulePlan.findMany({
    where: { moduleKey: "POD_CREATOR", isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return plans.filter((p) => {
    const limits = parsePodPlanLimits(p.limitsJson);
    return limits.isPublic !== false && !limits.adminOnly;
  });
}

export function buildPodLicenseMetadata(planKey: string, limits: PodPlanLimits) {
  return JSON.stringify({
    planKey,
    moduleKey: "POD_CREATOR",
    limits: {
      maxDesigns: limits.maxDesigns,
      maxProducts: limits.maxProducts,
      maxMockups: limits.maxMockups,
    },
    featureStatus: "COMING_SOON",
    grantedAt: new Date().toISOString(),
  });
}

export async function buildPodLicenseMetadataFromPlanKey(planKey: string) {
  const plan = await getPodPlan(planKey);
  const limits = parsePodPlanLimits(plan?.limitsJson);
  return buildPodLicenseMetadata(planKey, limits);
}
