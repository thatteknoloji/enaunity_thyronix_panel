import { prisma } from "@/lib/db";
import type { PayoutStatus } from "@prisma/client";
import {
  DEFAULT_PAYOUT_RULES,
  normalizePartnerType,
  type PartnerPayoutSettings,
} from "./types";

export function parsePartnerMetadata(metadataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(metadataJson || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getPayoutSettingsFromProfile(profile: {
  partnerType: string;
  metadataJson: string;
}): PartnerPayoutSettings & { payoutMinAmount: number; invoiceRequired: boolean } {
  const meta = parsePartnerMetadata(profile.metadataJson);
  const stored = (meta.payoutSettings || {}) as PartnerPayoutSettings;
  const type = normalizePartnerType(profile.partnerType);
  const defaults = DEFAULT_PAYOUT_RULES[type];
  return {
    iban: stored.iban || "",
    accountHolder: stored.accountHolder || "",
    taxIdentityNumber: stored.taxIdentityNumber || "",
    payoutMinAmount: stored.payoutMinAmount ?? defaults.payoutMinAmount,
    invoiceRequired: stored.invoiceRequired ?? defaults.invoiceRequired,
  };
}

export async function getPartnerPayoutSettings(partnerId: string) {
  const profile = await prisma.partnerProfile.findUnique({ where: { id: partnerId } });
  if (!profile) throw new Error("Partner bulunamadı");
  return getPayoutSettingsFromProfile(profile);
}

export async function updatePartnerPayoutSettings(
  partnerId: string,
  input: {
    iban?: string;
    accountHolder?: string;
    taxIdentityNumber?: string;
  },
  opts?: { admin?: boolean; payoutMinAmount?: number; invoiceRequired?: boolean }
) {
  const profile = await prisma.partnerProfile.findUnique({ where: { id: partnerId } });
  if (!profile) throw new Error("Partner bulunamadı");

  const meta = parsePartnerMetadata(profile.metadataJson);
  const current = (meta.payoutSettings || {}) as PartnerPayoutSettings;
  const type = normalizePartnerType(profile.partnerType);
  const defaults = DEFAULT_PAYOUT_RULES[type];

  const next: PartnerPayoutSettings = {
    ...current,
    ...(input.iban !== undefined ? { iban: normalizeIban(input.iban) } : {}),
    ...(input.accountHolder !== undefined ? { accountHolder: input.accountHolder.trim() } : {}),
    ...(input.taxIdentityNumber !== undefined
      ? { taxIdentityNumber: input.taxIdentityNumber.trim() }
      : {}),
  };

  if (opts?.admin) {
    if (opts.payoutMinAmount !== undefined) next.payoutMinAmount = opts.payoutMinAmount;
    if (opts.invoiceRequired !== undefined) next.invoiceRequired = opts.invoiceRequired;
  } else {
    next.payoutMinAmount = current.payoutMinAmount ?? defaults.payoutMinAmount;
    next.invoiceRequired = current.invoiceRequired ?? defaults.invoiceRequired;
  }

  if (next.iban && !validateIban(next.iban)) {
    throw new Error("Geçersiz IBAN formatı (TR ile 24 haneli olmalı)");
  }

  meta.payoutSettings = next;
  await prisma.partnerProfile.update({
    where: { id: partnerId },
    data: { metadataJson: JSON.stringify(meta) },
  });

  return getPayoutSettingsFromProfile({ ...profile, metadataJson: JSON.stringify(meta) });
}

export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function validateIban(iban: string): boolean {
  const n = normalizeIban(iban);
  return /^TR\d{24}$/.test(n);
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export async function getPayoutSummary(partnerId: string) {
  const [pendingAgg, approvedUnlockedAgg, paidCommAgg, paidPayoutAgg, activePayoutAgg] =
    await Promise.all([
      prisma.affiliateCommission.aggregate({
        where: { partnerId, status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.affiliateCommission.aggregate({
        where: { partnerId, status: "APPROVED", payoutId: null },
        _sum: { amount: true },
      }),
      prisma.affiliateCommission.aggregate({
        where: { partnerId, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.affiliatePayout.aggregate({
        where: { partnerId, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.affiliatePayout.aggregate({
        where: { partnerId, status: { in: ["REQUESTED", "PROCESSING"] } },
        _sum: { amount: true },
      }),
    ]);

  const pendingCommission = pendingAgg._sum.amount || 0;
  const approvedUnlocked = approvedUnlockedAgg._sum.amount || 0;
  const paidCommission = paidCommAgg._sum.amount || 0;
  const paidPayoutTotal = paidPayoutAgg._sum.amount || 0;
  const reservedInPayouts = activePayoutAgg._sum.amount || 0;

  const totalEarned = paidCommission + approvedUnlocked + reservedInPayouts;
  const withdrawableBalance = roundMoney(approvedUnlocked);

  return {
    totalEarned: roundMoney(totalEarned),
    pendingCommission: roundMoney(pendingCommission),
    approvedCommission: roundMoney(approvedUnlocked + reservedInPayouts),
    paidTotal: roundMoney(Math.max(paidPayoutTotal, paidCommission)),
    withdrawableBalance,
    reservedInPayouts: roundMoney(reservedInPayouts),
  };
}

export async function selectCommissionsFifo(partnerId: string, targetAmount: number) {
  const commissions = await prisma.affiliateCommission.findMany({
    where: { partnerId, status: "APPROVED", payoutId: null },
    orderBy: { createdAt: "asc" },
  });

  if (!commissions.length) {
    throw new Error("Çekilebilir komisyon bulunamadı");
  }

  const fullTotal = roundMoney(commissions.reduce((s, c) => s + c.amount, 0));
  const target = roundMoney(targetAmount);

  if (Math.abs(fullTotal - target) <= 0.01) {
    return { commissions, total: fullTotal };
  }

  let sum = 0;
  const selected: typeof commissions = [];
  for (const c of commissions) {
    selected.push(c);
    sum = roundMoney(sum + c.amount);
    if (sum >= target - 0.01) break;
  }

  if (Math.abs(sum - target) > 0.01) {
    throw new Error(
      `Tam ${target.toFixed(2)} ₺ için komisyon birleşimi yok. Çekilebilir bakiye: ${fullTotal.toFixed(2)} ₺`
    );
  }

  return { commissions: selected, total: sum };
}

export async function createPartnerPayoutRequest(input: {
  partnerId: string;
  amount?: number;
  iban: string;
  accountHolder: string;
  taxIdentityNumber?: string;
  invoiceUrl?: string;
  note?: string;
}) {
  const profile = await prisma.partnerProfile.findUnique({ where: { id: input.partnerId } });
  if (!profile) throw new Error("Partner bulunamadı");
  if (profile.status !== "ACTIVE") throw new Error("Partner profiliniz aktif değil");

  const settings = getPayoutSettingsFromProfile(profile);
  const summary = await getPayoutSummary(input.partnerId);

  const iban = normalizeIban(input.iban || settings.iban || "");
  const accountHolder = (input.accountHolder || settings.accountHolder || "").trim();

  if (!iban || !validateIban(iban)) {
    throw new Error("Geçerli IBAN gerekli. Önce Partner Ödeme Bilgilerinizi kaydedin.");
  }
  if (!accountHolder) {
    throw new Error("Hesap sahibi adı gerekli");
  }

  if (settings.invoiceRequired && !input.invoiceUrl?.trim()) {
    throw new Error("Fatura veya gider pusulası yüklemeniz gerekiyor");
  }

  const withdrawable = summary.withdrawableBalance;
  if (withdrawable <= 0) {
    throw new Error("Çekilebilir bakiye yok");
  }

  const requestedAmount = input.amount != null ? roundMoney(input.amount) : withdrawable;

  if (requestedAmount <= 0) {
    throw new Error("Geçersiz tutar");
  }
  if (requestedAmount > withdrawable + 0.01) {
    throw new Error("Talep tutarı çekilebilir bakiyeden büyük olamaz");
  }
  if (requestedAmount < settings.payoutMinAmount) {
    throw new Error(`Minimum ödeme tutarı ${settings.payoutMinAmount.toFixed(2)} ₺`);
  }

  const { commissions, total } = await selectCommissionsFifo(input.partnerId, requestedAmount);

  return prisma.$transaction(async (tx) => {
    const payout = await tx.affiliatePayout.create({
      data: {
        partnerId: input.partnerId,
        amount: total,
        currency: "TRY",
        status: "REQUESTED",
        iban,
        accountHolder,
        taxIdentityNumber: input.taxIdentityNumber || settings.taxIdentityNumber || null,
        invoiceUrl: input.invoiceUrl || null,
        note: input.note || null,
        paymentMethod: "bank_transfer",
        requestedAt: new Date(),
      },
    });

    await tx.affiliateCommission.updateMany({
      where: { id: { in: commissions.map((c) => c.id) } },
      data: { payoutId: payout.id },
    });

    return payout;
  });
}

export async function updatePartnerPayoutAdmin(input: {
  id: string;
  status?: PayoutStatus;
  adminNote?: string;
}) {
  const payout = await prisma.affiliatePayout.findUnique({ where: { id: input.id } });
  if (!payout) throw new Error("Ödeme talebi bulunamadı");

  const now = new Date();
  const data: {
    status?: PayoutStatus;
    adminNote?: string;
    processedAt?: Date;
    paidAt?: Date;
    paymentNote?: string;
  } = {};

  if (input.adminNote !== undefined) {
    data.adminNote = input.adminNote;
    data.paymentNote = input.adminNote;
  }

  if (input.status) {
    data.status = input.status;
    if (input.status === "PROCESSING") {
      data.processedAt = now;
    }
    if (input.status === "PAID") {
      data.paidAt = now;
      if (!payout.processedAt) data.processedAt = now;
    }
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.affiliatePayout.update({ where: { id: input.id }, data });

    if (input.status === "REJECTED" || input.status === "CANCELLED") {
      await tx.affiliateCommission.updateMany({
        where: { payoutId: input.id, status: { not: "PAID" } },
        data: { payoutId: null },
      });
    }

    if (input.status === "PAID") {
      await tx.affiliateCommission.updateMany({
        where: { payoutId: input.id },
        data: { status: "PAID", paidAt: now },
      });
    }

    return row;
  });
}

export type AdminPayoutFilters = {
  status?: string;
  partnerType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export async function listAdminPayouts(filters: AdminPayoutFilters, limit = 200) {
  const where: Record<string, unknown> = {};

  if (filters.status) where.status = filters.status;

  if (filters.dateFrom || filters.dateTo) {
    where.requestedAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59`) } : {}),
    };
  }

  if (filters.partnerType) {
    where.partner = { ...(where.partner as object | undefined), partnerType: filters.partnerType };
  }

  if (filters.search) {
    const q = filters.search.trim();
    const users = await prisma.user.findMany({
      where: { OR: [{ email: { contains: q } }, { name: { contains: q } }] },
      select: { id: true },
      take: 50,
    });
    where.OR = [
      { iban: { contains: q.replace(/\s/g, "") } },
      { partner: { referralCode: { contains: q } } },
      ...(users.length ? [{ partner: { userId: { in: users.map((u) => u.id) } } }] : []),
    ];
  }

  const rows = await prisma.affiliatePayout.findMany({
    where: where as never,
    orderBy: { requestedAt: "desc" },
    take: limit,
    include: {
      partner: true,
      commissions: { select: { id: true, amount: true } },
    },
  });

  return Promise.all(
    rows.map(async (p) => {
      const user = await prisma.user.findUnique({
        where: { id: p.partner.userId },
        select: { name: true, email: true },
      });
      return {
        ...p,
        partnerName: user?.name || "",
        partnerEmail: user?.email || "",
        partnerType: p.partner.partnerType,
        referralCode: p.partner.referralCode,
        commissionCount: p.commissions.length,
      };
    })
  );
}

export async function listPartnerPayouts(partnerId: string, limit = 50) {
  return prisma.affiliatePayout.findMany({
    where: { partnerId },
    orderBy: { requestedAt: "desc" },
    take: limit,
    include: { commissions: { select: { id: true, amount: true, commissionType: true } } },
  });
}

export async function getPartnerDetailForAdmin(partnerId: string) {
  const profile = await prisma.partnerProfile.findUnique({
    where: { id: partnerId },
    include: {
      sponsorPartner: { select: { id: true, referralCode: true, partnerType: true } },
      _count: { select: { sponsoredPartners: true, referrals: true, commissions: true, payouts: true } },
    },
  });
  if (!profile) return null;

  const user = await prisma.user.findUnique({
    where: { id: profile.userId },
    select: { name: true, email: true, phone: true },
  });

  const [summary, settings, payouts, recentCommissions] = await Promise.all([
    getPayoutSummary(partnerId),
    getPayoutSettingsFromProfile(profile),
    listPartnerPayouts(partnerId, 20),
    prisma.affiliateCommission.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return { profile, user, summary, settings, payouts, recentCommissions };
}

export async function updateAdminPartnerPayoutRules(
  partnerId: string,
  rules: { payoutMinAmount?: number; invoiceRequired?: boolean }
) {
  return updatePartnerPayoutSettings(partnerId, {}, { admin: true, ...rules });
}
