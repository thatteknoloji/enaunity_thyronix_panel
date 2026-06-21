import { prisma } from "@/lib/db";
import { buildPodLicenseMetadataFromPlanKey } from "@/lib/pod/plans";

/** Ödeme veya admin ataması sonrası lisans metadata + usage limitlerini plana göre doldur */
export async function syncLicenseMetadataFromPlan(licenseId: string, moduleKey: string, planKey: string) {
  const plan = await prisma.modulePlan.findFirst({
    where: { moduleKey, planKey },
  });
  if (!plan) return;

  let metadataJson = plan.limitsJson;
  if (moduleKey === "POD_CREATOR") {
    metadataJson = await buildPodLicenseMetadataFromPlanKey(planKey);
  } else {
    metadataJson = JSON.stringify({
      planKey,
      moduleKey,
      limits: JSON.parse(plan.limitsJson || "{}"),
      grantedAt: new Date().toISOString(),
    });
  }

  await prisma.moduleLicense.update({
    where: { id: licenseId },
    data: {
      metadataJson,
      usageLimitJson: plan.limitsJson,
    },
  });
}
