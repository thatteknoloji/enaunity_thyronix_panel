import { prisma } from "@/lib/db";
import { getPartnerProfileByUserId } from "./profile";
import { normalizePartnerType, PARTNER_TYPE_DESCRIPTIONS, type PartnerTypeV2 } from "./types";
import { getModuleLicenseState } from "@/lib/modules/access";
import { MARKETPLACE_MODULES, type MarketplaceModuleKey } from "@/lib/modules/marketplace";

export type PartnerApplyPrefill = {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  hasTaxPlate: boolean;
  socialMedia: string;
};

export type PartnerApplyContext = {
  prefill: PartnerApplyPrefill;
  isApprovedDealer: boolean;
  dealerStatus: string | null;
  approvalStatus: string | null;
  documentStatus: string | null;
  paymentStatus: string | null;
  partnerProfile: {
    id: string;
    status: string;
    partnerType: string;
    normalizedType: PartnerTypeV2;
  } | null;
  pendingApplication: {
    id: string;
    requestedType: string;
    status: string;
    createdAt: string;
  } | null;
  moduleLicenses: Record<
    MarketplaceModuleKey,
    { state: "active" | "pending" | "none"; checkoutPath: string; gatewayPath: string }
  >;
  suggestedPartnerType: PartnerTypeV2;
};

const AI_PARTNER_MODULES: MarketplaceModuleKey[] = ["LINKSLASH", "HIVE", "THYRONIX"];

export async function getPartnerApplyContext(userId: string, dealerId?: string | null): Promise<PartnerApplyContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, company: true, taxNumber: true },
  });

  const dealer = dealerId
    ? await prisma.dealer.findUnique({
        where: { id: dealerId },
        select: {
          name: true,
          company: true,
          email: true,
          phone: true,
          taxNumber: true,
          status: true,
        },
      })
    : null;

  const approval = dealerId
    ? await prisma.dealerApproval.findUnique({ where: { dealerId } })
    : null;

  const partnerProfile = await getPartnerProfileByUserId(userId);
  const email = (dealer?.email || user?.email || "").toLowerCase();

  const pendingApplication = await prisma.partnerNetworkApplication.findFirst({
    where: {
      status: "PENDING",
      OR: [{ userId }, ...(email ? [{ email }] : [])],
    },
    orderBy: { createdAt: "desc" },
  });

  let socialMedia = "";
  if (partnerProfile?.metadataJson) {
    try {
      const meta = JSON.parse(partnerProfile.metadataJson) as { socialMedia?: string };
      socialMedia = meta.socialMedia || "";
    } catch {
      /* ignore */
    }
  }

  const prefill: PartnerApplyPrefill = {
    fullName: dealer?.name || user?.name || "",
    companyName: dealer?.company || approval?.companyName || user?.company || "",
    email: dealer?.email || user?.email || "",
    phone: dealer?.phone || approval?.phone || user?.phone || "",
    hasTaxPlate: Boolean(dealer?.taxNumber || approval?.taxNumber || user?.taxNumber),
    socialMedia,
  };

  const isApprovedDealer =
    Boolean(dealerId) &&
    dealer?.status === "ACTIVE" &&
    approval?.status === "ACTIVE";

  const moduleKeys = ["LINKSLASH", "HIVE", "THYRONIX", "POD_CREATOR"] as const;
  const moduleLicenseEntries = await Promise.all(
    moduleKeys.map(async (key) => {
      const state = dealerId ? await getModuleLicenseState(dealerId, key) : ("none" as const);
      const meta = MARKETPLACE_MODULES[key];
      return [
        key,
        { state, checkoutPath: meta.checkoutPath, gatewayPath: meta.gatewayPath },
      ] as const;
    })
  );

  const hasTaxPlate = prefill.hasTaxPlate;
  const suggestedPartnerType: PartnerTypeV2 = hasTaxPlate ? "PROFESSIONAL_DEALER" : "SOCIAL_DEALER";

  return {
    prefill,
    isApprovedDealer,
    dealerStatus: dealer?.status || null,
    approvalStatus: approval?.status || null,
    documentStatus: approval?.documentStatus || null,
    paymentStatus: approval?.paymentStatus || null,
    partnerProfile: partnerProfile
      ? {
          id: partnerProfile.id,
          status: partnerProfile.status,
          partnerType: partnerProfile.partnerType,
          normalizedType: normalizePartnerType(partnerProfile.partnerType),
        }
      : null,
    pendingApplication: pendingApplication
      ? {
          id: pendingApplication.id,
          requestedType: pendingApplication.requestedType,
          status: pendingApplication.status,
          createdAt: pendingApplication.createdAt.toISOString(),
        }
      : null,
    moduleLicenses: Object.fromEntries(moduleLicenseEntries) as PartnerApplyContext["moduleLicenses"],
    suggestedPartnerType,
  };
}

export function resolveModuleIntentPath(
  requestedType: string,
  ctx: PartnerApplyContext
): string | null {
  if (requestedType === "POD_CREATOR") {
    const pod = ctx.moduleLicenses.POD_CREATOR;
    if (pod.state === "active") return "/dealer/pod";
    if (pod.state === "pending") return "/gateway/pod";
    return pod.checkoutPath;
  }

  if (requestedType === "AI_PARTNER") {
    const missing = AI_PARTNER_MODULES.filter((k) => ctx.moduleLicenses[k].state === "none");
    if (missing.length === AI_PARTNER_MODULES.length) {
      return "/dealer/modules";
    }
    const firstPending = AI_PARTNER_MODULES.find((k) => ctx.moduleLicenses[k].state === "pending");
    if (firstPending) return ctx.moduleLicenses[firstPending].gatewayPath;
    return "/dealer/modules";
  }

  return null;
}

export { PARTNER_TYPE_DESCRIPTIONS };
