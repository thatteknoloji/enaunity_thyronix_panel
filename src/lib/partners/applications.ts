import { prisma } from "@/lib/db";
import { readReferralCodeFromCookie, getPartnerByReferralCode } from "./referral";
import { inferPartnerTypeFromApplication, normalizePartnerType } from "./types";
import type { PartnerTypeV2 } from "./types";
import { createPartnerFromApplication } from "./profile";

export async function submitPartnerApplication(input: {
  userId?: string;
  dealerId?: string | null;
  fullName: string;
  companyName?: string;
  email: string;
  phone?: string;
  requestedType: string;
  hasTaxPlate?: boolean;
  socialMedia?: string;
  applicationNote?: string;
}) {
  const inferred = inferPartnerTypeFromApplication({
    requestedType: input.requestedType,
    hasTaxPlate: input.hasTaxPlate,
  });

  if (inferred === "POD_CREATOR") {
    throw new Error("POD Creator modül lisansı için Modül Pazarı veya ödeme ekranını kullanın");
  }

  let sponsorPartnerId: string | null = null;
  const code = await readReferralCodeFromCookie();
  if (code) {
    const sponsor = await getPartnerByReferralCode(code);
    sponsorPartnerId = sponsor?.id || null;
  }

  const email = input.email.toLowerCase();
  let fastTrackApproved = false;

  if (input.dealerId && input.userId && (inferred === "SOCIAL_DEALER" || inferred === "PROFESSIONAL_DEALER" || inferred === "AI_PARTNER")) {
    const [dealer, approval] = await Promise.all([
      prisma.dealer.findUnique({ where: { id: input.dealerId }, select: { status: true } }),
      prisma.dealerApproval.findUnique({ where: { dealerId: input.dealerId } }),
    ]);
    fastTrackApproved =
      dealer?.status === "ACTIVE" &&
      approval?.status === "ACTIVE" &&
      approval.documentStatus === "APPROVED";
  }

  const pending = await prisma.partnerNetworkApplication.findFirst({
    where: {
      email,
      status: "PENDING",
    },
  });

  const applicationData = {
    fullName: input.fullName,
    companyName: input.companyName || "",
    phone: input.phone || "",
    requestedType: inferred as never,
    hasTaxPlate: Boolean(input.hasTaxPlate),
    socialMedia: input.socialMedia || "",
    applicationNote: input.applicationNote || "",
    sponsorPartnerId,
    userId: input.userId || null,
    dealerId: input.dealerId || null,
  };

  if (fastTrackApproved && input.userId) {
    await createPartnerFromApplication({
      userId: input.userId,
      dealerId: input.dealerId,
      partnerType: inferred,
      sponsorPartnerId,
      metadata: {
        socialMedia: input.socialMedia,
        hasTaxPlate: input.hasTaxPlate,
        applicationNote: input.applicationNote,
        fastTrack: true,
      },
    });

    if (pending) {
      return prisma.partnerNetworkApplication.update({
        where: { id: pending.id },
        data: {
          ...applicationData,
          status: "APPROVED",
          reviewedBy: "SYSTEM",
          reviewedAt: new Date(),
          adminNote: "Onaylı bayi — otomatik partner aktivasyonu",
        },
      });
    }

    return prisma.partnerNetworkApplication.create({
      data: {
        ...applicationData,
        email,
        status: "APPROVED",
        reviewedBy: "SYSTEM",
        reviewedAt: new Date(),
        adminNote: "Onaylı bayi — otomatik partner aktivasyonu",
      },
    });
  }

  if (pending) {
    return prisma.partnerNetworkApplication.update({
      where: { id: pending.id },
      data: applicationData,
    });
  }

  return prisma.partnerNetworkApplication.create({
    data: {
      ...applicationData,
      email,
      status: "PENDING",
    },
  });
}

export async function listPartnerApplications(status?: string, limit = 100) {
  return prisma.partnerNetworkApplication.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function reviewPartnerApplication(input: {
  id: string;
  action: "approve" | "reject";
  adminName: string;
  adminNote?: string;
  partnerType?: PartnerTypeV2 | string;
}) {
  const app = await prisma.partnerNetworkApplication.findUnique({ where: { id: input.id } });
  if (!app) throw new Error("Başvuru bulunamadı");

  if (input.action === "reject") {
    return prisma.partnerNetworkApplication.update({
      where: { id: input.id },
      data: {
        status: "REJECTED",
        adminNote: input.adminNote || "",
        reviewedBy: input.adminName,
        reviewedAt: new Date(),
      },
    });
  }

  const type = normalizePartnerType(input.partnerType || app.requestedType);
  let userId = app.userId;

  if (!userId) {
    const user = await prisma.user.findUnique({ where: { email: app.email } });
    userId = user?.id || null;
  }

  if (userId) {
    const { createPartnerFromApplication } = await import("./profile");
    await createPartnerFromApplication({
      userId,
      dealerId: app.dealerId,
      partnerType: type,
      sponsorPartnerId: app.sponsorPartnerId,
      metadata: {
        socialMedia: app.socialMedia,
        hasTaxPlate: app.hasTaxPlate,
        applicationNote: app.applicationNote,
      },
    });
  }

  return prisma.partnerNetworkApplication.update({
    where: { id: input.id },
    data: {
      status: "APPROVED",
      requestedType: type as never,
      adminNote: input.adminNote || "",
      reviewedBy: input.adminName,
      reviewedAt: new Date(),
    },
  });
}
