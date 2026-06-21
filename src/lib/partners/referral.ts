import { createHash, randomBytes } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_DAYS,
  type PartnerType,
} from "./types";

const CODE_PREFIX = "ENA";

export function generateReferralCode(): string {
  return `${CODE_PREFIX}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function generateReferralSlug(nameOrEmail: string): string {
  const base = nameOrEmail
    .toLowerCase()
    .replace(/@.+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return base || "partner";
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = generateReferralCode();
    const exists = await prisma.partnerProfile.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  return `${CODE_PREFIX}-${Date.now().toString(36).toUpperCase()}`;
}

export async function generateUniqueReferralSlug(nameOrEmail: string): Promise<string> {
  const base = generateReferralSlug(nameOrEmail);
  for (let i = 0; i < 8; i++) {
    const slug = i === 0 ? base : `${base}-${i}`;
    const exists = await prisma.partnerProfile.findUnique({ where: { referralSlug: slug } });
    if (!exists) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export function buildReferralLink(referralCode: string, origin?: string): string {
  const base = (origin || process.env.NEXT_PUBLIC_APP_URL || "https://enaunity.com.tr").replace(/\/$/, "");
  return `${base}/?ref=${encodeURIComponent(referralCode)}`;
}

export function buildReferralSlugLink(referralSlug: string, origin?: string): string {
  const base = (origin || process.env.NEXT_PUBLIC_APP_URL || "https://enaunity.com.tr").replace(/\/$/, "");
  return `${base}/r/${encodeURIComponent(referralSlug)}`;
}

export async function getPartnerByReferralCode(code: string) {
  return prisma.partnerProfile.findFirst({
    where: { referralCode: code.toUpperCase(), status: "ACTIVE" },
  });
}

export async function getPartnerBySlug(slug: string) {
  return prisma.partnerProfile.findFirst({
    where: { referralSlug: slug.toLowerCase(), status: "ACTIVE" },
  });
}

export async function getOrCreatePartnerProfile(
  userId: string,
  dealerId?: string | null,
  type: PartnerType = "SOCIAL_DEALER",
  opts?: { activate?: boolean; name?: string; sponsorPartnerId?: string }
) {
  const existing = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (existing) return existing;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const label = opts?.name || user?.name || user?.email || "partner";
  const referralCode = await generateUniqueReferralCode();
  const referralSlug = await generateUniqueReferralSlug(label);

  return prisma.partnerProfile.create({
    data: {
      userId,
      dealerId: dealerId || null,
      partnerType: type,
      referralCode,
      referralSlug,
      sponsorPartnerId: opts?.sponsorPartnerId || null,
      status: opts?.activate ? "ACTIVE" : "PENDING",
      metadataJson: "{}",
    },
  });
}

function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:ena-ref`).digest("hex").slice(0, 32);
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = REFERRAL_COOKIE_DAYS * 24 * 60 * 60;
  return { httpOnly: true, sameSite: "lax" as const, secure, maxAge, path: "/" };
}

export function attachReferralCookie(response: NextResponse, referralCode: string): NextResponse {
  response.cookies.set(REFERRAL_COOKIE, referralCode.toUpperCase(), cookieOptions());
  return response;
}

export async function readReferralCodeFromCookie(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const val = store.get(REFERRAL_COOKIE)?.value;
  return val ? val.toUpperCase() : null;
}

/** Duplicate flood önleme: aynı IP+UA+partner için son 5 dk içinde kayıt varsa tekrar oluşturma */
async function shouldSkipDuplicateVisit(partnerId: string, ipHash: string, userAgent: string): Promise<boolean> {
  if (!ipHash) return false;
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const recent = await prisma.affiliateReferral.findFirst({
    where: {
      partnerId,
      ipHash,
      userAgent: userAgent.slice(0, 200),
      status: "VISIT",
      createdAt: { gte: since },
    },
  });
  return Boolean(recent);
}

export async function recordReferralVisit(input: {
  referralCode: string;
  landingPath: string;
  sourceUrl?: string;
  ip?: string;
  userAgent?: string;
}) {
  const partner = await getPartnerByReferralCode(input.referralCode);
  if (!partner) return null;

  const ipHash = input.ip ? hashIp(input.ip) : null;
  const ua = (input.userAgent || "").slice(0, 200);

  if (ipHash && (await shouldSkipDuplicateVisit(partner.id, ipHash, ua))) {
    return { partner, referral: null, duplicate: true };
  }

  const referral = await prisma.affiliateReferral.create({
    data: {
      partnerId: partner.id,
      referralCode: partner.referralCode,
      landingPath: input.landingPath,
      sourceUrl: input.sourceUrl || null,
      ipHash,
      userAgent: ua || null,
      status: "VISIT",
    },
  });

  return { partner, referral, duplicate: false };
}

export async function resolveReferralFromRequest(request: NextRequest): Promise<{
  referralCode: string | null;
  slug: string | null;
}> {
  const pathname = request.nextUrl.pathname;
  const ref = request.nextUrl.searchParams.get("ref");

  if (pathname.startsWith("/r/")) {
    const slug = pathname.split("/")[2]?.split("?")[0] || null;
    if (slug) {
      const partner = await getPartnerBySlug(slug);
      return { referralCode: partner?.referralCode || null, slug };
    }
  }

  if (ref) {
    return { referralCode: ref.toUpperCase(), slug: null };
  }

  const cookieCode = request.cookies.get(REFERRAL_COOKIE)?.value;
  if (cookieCode) {
    return { referralCode: cookieCode.toUpperCase(), slug: null };
  }

  return { referralCode: null, slug: null };
}

export async function attachReferralOnRegistration(userId: string, dealerId?: string | null) {
  const code = await readReferralCodeFromCookie();
  if (!code) return null;

  const partner = await getPartnerByReferralCode(code);
  if (!partner) return null;

  const open = await prisma.affiliateReferral.findFirst({
    where: {
      partnerId: partner.id,
      referralCode: code,
      status: "VISIT",
    },
    orderBy: { createdAt: "desc" },
  });

  let referral;
  if (open) {
    referral = await prisma.affiliateReferral.update({
      where: { id: open.id },
      data: {
        referredUserId: userId,
        referredDealerId: dealerId || null,
        status: "REGISTERED",
      },
    });
  } else {
    referral = await prisma.affiliateReferral.create({
      data: {
        partnerId: partner.id,
        referralCode: code,
        referredUserId: userId,
        referredDealerId: dealerId || null,
        status: "REGISTERED",
      },
    });
  }

  // Sponsor ata — tek kat
  const existingProfile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (existingProfile && !existingProfile.sponsorPartnerId) {
    await prisma.partnerProfile.update({
      where: { id: existingProfile.id },
      data: { sponsorPartnerId: partner.id },
    });
  } else if (!existingProfile) {
    await getOrCreatePartnerProfile(userId, dealerId, "SOCIAL_DEALER", {
      activate: false,
      sponsorPartnerId: partner.id,
    });
  }

  return referral;
}

export async function findActiveReferralForUser(userId: string, dealerId?: string | null) {
  return prisma.affiliateReferral.findFirst({
    where: {
      OR: [{ referredUserId: userId }, ...(dealerId ? [{ referredDealerId: dealerId }] : [])],
      status: { in: ["REGISTERED", "LICENSED", "FIRST_ORDER"] },
    },
    orderBy: { createdAt: "desc" },
    include: { partner: true },
  });
}
