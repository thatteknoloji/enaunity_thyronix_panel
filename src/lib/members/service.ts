import type { MemberDocument, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  MEMBER_CHECKLIST_KEYS,
  MEMBER_CHECKLIST_LABELS,
  MEMBER_REQUIRED_CONTRACTS,
  MEMBER_REQUIRED_DOCUMENTS,
  type MemberChecklist,
  type MemberChecklistItem,
} from "./checklist";
import { userMissingRequiredSlugs } from "@/lib/legal/acceptance";
import { DEALER_REQUIRED_SLUGS } from "@/lib/legal/constants";

export type MemberProfileInput = {
  name?: string;
  phone?: string;
  company?: string;
  taxNumber?: string;
  taxOffice?: string;
  adminNote?: string;
};

export function parseContractsAccepted(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function computeMemberChecklist(
  user: Pick<User, "email" | "name" | "phone" | "company" | "taxNumber" | "taxOffice" | "kvkkAcceptedAt" | "contractsAcceptedJson">,
  documents: Pick<MemberDocument, "type" | "status">[]
): MemberChecklistItem[] {
  const contracts = parseContractsAccepted(user.contractsAcceptedJson);
  const approvedDocs = new Set(documents.filter((d) => d.status === "approved").map((d) => d.type));
  const uploadedDocs = new Set(documents.map((d) => d.type));

  const checks: Record<(typeof MEMBER_CHECKLIST_KEYS)[number], { ok: boolean; detail: string }> = {
    emailValid: {
      ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email),
      detail: user.email || "E-posta yok",
    },
    identityVerified: {
      ok: user.name.trim().length >= 3,
      detail: user.name.trim() ? user.name : "Ad soyad eksik",
    },
    companyInfo: {
      ok: user.company.trim().length >= 2,
      detail: user.company.trim() || "Firma / ünvan girilmemiş",
    },
    taxInfo: {
      ok: user.taxNumber.trim().length >= 10 && user.taxOffice.trim().length >= 2,
      detail:
        user.taxNumber.trim() && user.taxOffice.trim()
          ? `${user.taxNumber} · ${user.taxOffice}`
          : "Vergi no veya vergi dairesi eksik",
    },
    phoneVerified: {
      ok: user.phone.replace(/\D/g, "").length >= 10,
      detail: user.phone.trim() || "Telefon girilmemiş",
    },
    kvkkAccepted: {
      ok: !!user.kvkkAcceptedAt,
      detail: user.kvkkAcceptedAt
        ? `Onay: ${new Date(user.kvkkAcceptedAt).toLocaleDateString("tr-TR")}`
        : "KVKK onayı kayıtlı değil",
    },
    contractsSigned: {
      ok: MEMBER_REQUIRED_CONTRACTS.every((slug) => contracts.includes(slug)),
      detail: MEMBER_REQUIRED_CONTRACTS.every((slug) => contracts.includes(slug))
        ? "Zorunlu sözleşmeler kabul edildi"
        : `Eksik: ${MEMBER_REQUIRED_CONTRACTS.filter((s) => !contracts.includes(s)).join(", ")}`,
    },
    documentsUploaded: {
      ok: MEMBER_REQUIRED_DOCUMENTS.every((t) => approvedDocs.has(t)),
      detail: MEMBER_REQUIRED_DOCUMENTS.every((t) => approvedDocs.has(t))
        ? "Tüm evraklar onaylandı"
        : MEMBER_REQUIRED_DOCUMENTS.map((t) => {
            if (approvedDocs.has(t)) return `${t}: onaylı`;
            if (uploadedDocs.has(t)) return `${t}: inceleme bekliyor`;
            return `${t}: yüklenmedi`;
          }).join(" · "),
    },
  };

  return MEMBER_CHECKLIST_KEYS.map((key) => ({
    key,
    label: MEMBER_CHECKLIST_LABELS[key],
    ok: checks[key].ok,
    detail: checks[key].detail,
  }));
}

export function checklistItemsComplete(items: MemberChecklistItem[]): boolean {
  return items.every((i) => i.ok);
}

export function checklistToLegacyRecord(items: MemberChecklistItem[]): MemberChecklist {
  return Object.fromEntries(items.map((i) => [i.key, i.ok])) as MemberChecklist;
}

export async function getMemberWithDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberDocuments: { orderBy: { createdAt: "desc" } },
      dealer: { select: { id: true, company: true, status: true } },
      _count: { select: { orders: true } },
    },
  });
  if (!user) return null;

  let checklist = computeMemberChecklist(user, user.memberDocuments);
  const missingLegal = await userMissingRequiredSlugs(userId, MEMBER_REQUIRED_CONTRACTS);
  checklist = checklist.map((item) => {
    if (item.key === "contractsSigned") {
      return {
        ...item,
        ok: missingLegal.length === 0,
        detail: missingLegal.length === 0
          ? "Zorunlu sözleşmeler güncel sürümle onaylandı"
          : `Eksik/yenileme gerekli: ${missingLegal.join(", ")}`,
      };
    }
    if (item.key === "kvkkAccepted") {
      const kvkkMissing = missingLegal.includes("kvkk-aydinlatma-metni");
      return {
        ...item,
        ok: !!user.kvkkAcceptedAt && !kvkkMissing,
        detail: kvkkMissing ? "KVKK metni güncellendi — yeniden onay gerekli" : item.detail,
      };
    }
    return item;
  });
  const contractsAccepted = parseContractsAccepted(user.contractsAcceptedJson);

  return {
    ...user,
    checklist,
    contractsAccepted,
    checklistComplete: checklistItemsComplete(checklist),
    missingDocuments: MEMBER_REQUIRED_DOCUMENTS.filter(
      (t) => !user.memberDocuments.some((d) => d.type === t && d.status === "approved")
    ),
  };
}

export async function promoteMemberToDealer(userId: string, adminName: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberDocuments: true, dealer: true },
  });
  if (!user) throw new Error("Üye bulunamadı");
  if (user.role === "dealer" && user.dealerId) {
    return { dealerId: user.dealerId, alreadyDealer: true };
  }
  if (user.status !== "active") throw new Error("Önce üye onayı tamamlanmalı");

  const missingDealerLegal = await userMissingRequiredSlugs(userId, DEALER_REQUIRED_SLUGS);
  if (missingDealerLegal.length > 0) {
    throw new Error(`Bayiye çevirmek için bayi sözleşmeleri onaylanmalı: ${missingDealerLegal.join(", ")}`);
  }

  const checklist = computeMemberChecklist(user, user.memberDocuments);
  if (!checklistItemsComplete(checklist)) {
    throw new Error("Bayiye çevirmek için tüm koşullar ve evrak onayları tamamlanmalı");
  }

  const existingDealer = await prisma.dealer.findUnique({ where: { email: user.email } });
  let dealerId = existingDealer?.id;

  if (!dealerId) {
    const dealer = await prisma.dealer.create({
      data: {
        name: user.name,
        title: "",
        email: user.email,
        phone: user.phone,
        company: user.company || user.name,
        location: "",
        companySize: "",
        markets: "Türkiye",
        taxNumber: user.taxNumber,
        taxOffice: user.taxOffice,
        group: "bronze",
        status: "active",
      },
    });
    dealerId = dealer.id;
  }

  await prisma.dealerApproval.upsert({
    where: { dealerId },
    create: {
      dealerId,
      status: "PENDING_ADMIN_APPROVAL",
      companyName: user.company,
      taxNumber: user.taxNumber,
      taxOffice: user.taxOffice,
      phone: user.phone,
      documentStatus: "APPROVED",
      paymentStatus: "PENDING",
      adminNote: `Üyeden bayiye çevrildi · ${adminName}`,
    },
    update: {
      companyName: user.company,
      taxNumber: user.taxNumber,
      taxOffice: user.taxOffice,
      phone: user.phone,
      documentStatus: "APPROVED",
    },
  });

  for (const doc of user.memberDocuments) {
    const exists = await prisma.dealerDocument.findFirst({
      where: { dealerId, type: doc.type, fileUrl: doc.fileUrl },
    });
    if (!exists) {
      await prisma.dealerDocument.create({
        data: {
          dealerId,
          title: doc.title,
          type: doc.type,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          status: doc.status,
          adminNote: doc.adminNote,
        },
      });
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: "dealer", dealerId, reviewedBy: adminName },
  });

  return { dealerId, alreadyDealer: false };
}

export async function syncMemberChecklistSnapshot(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberDocuments: true },
  });
  if (!user) return;
  const checklist = computeMemberChecklist(user, user.memberDocuments);
  await prisma.user.update({
    where: { id: userId },
    data: { approvalChecklistJson: JSON.stringify(checklistToLegacyRecord(checklist)) },
  });
}
