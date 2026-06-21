import { prisma } from "@/lib/db";
import { readReferralCodeFromCookie, getPartnerByReferralCode } from "./referral";
import { inferPartnerTypeFromApplication, normalizePartnerType } from "./types";
import type { PartnerTypeV2 } from "./types";

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

  let sponsorPartnerId: string | null = null;
  const code = await readReferralCodeFromCookie();
  if (code) {
    const sponsor = await getPartnerByReferralCode(code);
    sponsorPartnerId = sponsor?.id || null;
  }

  const pending = await prisma.partnerNetworkApplication.findFirst({
    where: {
      email: input.email.toLowerCase(),
      status: "PENDING",
    },
  });
  if (pending) {
    return prisma.partnerNetworkApplication.update({
      where: { id: pending.id },
      data: {
        fullName: input.fullName,
        companyName: input.companyName || "",
        phone: input.phone || "",
        requestedType: inferred as never,
        hasTaxPlate: Boolean(input.hasTaxPlate),
        socialMedia: input.socialMedia || "",
        applicationNote: input.applicationNote || "",
        sponsorPartnerId,
      },
    });
  }

  return prisma.partnerNetworkApplication.create({
    data: {
      userId: input.userId || null,
      dealerId: input.dealerId || null,
      fullName: input.fullName,
      companyName: input.companyName || "",
      email: input.email.toLowerCase(),
      phone: input.phone || "",
      requestedType: inferred as never,
      hasTaxPlate: Boolean(input.hasTaxPlate),
      socialMedia: input.socialMedia || "",
      applicationNote: input.applicationNote || "",
      sponsorPartnerId,
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
