export const MEMBER_STATUSES = ["pending", "active", "rejected", "suspended"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const MEMBER_CHECKLIST_KEYS = [
  "emailValid",
  "identityVerified",
  "companyInfo",
  "taxInfo",
  "phoneVerified",
  "kvkkAccepted",
  "contractsSigned",
  "documentsUploaded",
] as const;

export type MemberChecklistKey = (typeof MEMBER_CHECKLIST_KEYS)[number];

export type MemberChecklist = Record<MemberChecklistKey, boolean>;

export type MemberChecklistItem = {
  key: MemberChecklistKey;
  label: string;
  ok: boolean;
  detail: string;
};

export const MEMBER_CHECKLIST_LABELS: Record<MemberChecklistKey, string> = {
  emailValid: "E-posta geçerli",
  identityVerified: "Ad soyad tam",
  companyInfo: "Firma bilgileri",
  taxInfo: "Vergi no & dairesi",
  phoneVerified: "Telefon numarası",
  kvkkAccepted: "KVKK onayı",
  contractsSigned: "Zorunlu sözleşmeler",
  documentsUploaded: "Evraklar onaylandı",
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  pending: "Onay Bekliyor",
  active: "Aktif Üye",
  rejected: "Reddedildi",
  suspended: "Askıda",
};

import {
  MEMBER_REQUIRED_LEGAL_SLUGS,
  REGISTRATION_OPTIONAL_SLUGS,
  DEALER_REQUIRED_SLUGS,
} from "@/lib/legal/constants";

export { REGISTRATION_OPTIONAL_SLUGS, DEALER_REQUIRED_SLUGS };

/** Zorunlu sözleşme slug'ları (kayıt sırasında kabul) */
export const MEMBER_REQUIRED_CONTRACTS = MEMBER_REQUIRED_LEGAL_SLUGS;

/** Zorunlu evrak türleri — admin her birini ayrı onaylar */
export const MEMBER_REQUIRED_DOCUMENTS = [
  "tax_levy",
  "signature_circular",
  "trade_registry",
] as const;

export const MEMBER_DOCUMENT_LABELS: Record<(typeof MEMBER_REQUIRED_DOCUMENTS)[number], string> = {
  tax_levy: "Vergi Levhası",
  signature_circular: "İmza Sirküleri",
  trade_registry: "Ticaret Sicil Gazetesi",
};

export const EMPTY_MEMBER_CHECKLIST: MemberChecklist = {
  emailValid: false,
  identityVerified: false,
  companyInfo: false,
  taxInfo: false,
  phoneVerified: false,
  kvkkAccepted: false,
  contractsSigned: false,
  documentsUploaded: false,
};

export function parseMemberChecklist(raw: string | null | undefined): MemberChecklist {
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    const out = { ...EMPTY_MEMBER_CHECKLIST };
    for (const key of MEMBER_CHECKLIST_KEYS) {
      out[key] = !!parsed[key];
    }
    return out;
  } catch {
    return { ...EMPTY_MEMBER_CHECKLIST };
  }
}

export function checklistComplete(checklist: MemberChecklist): boolean {
  return MEMBER_CHECKLIST_KEYS.every((k) => checklist[k]);
}

export function checklistProgress(checklist: MemberChecklist): { done: number; total: number } {
  const done = MEMBER_CHECKLIST_KEYS.filter((k) => checklist[k]).length;
  return { done, total: MEMBER_CHECKLIST_KEYS.length };
}

export function checklistItemsProgress(items: MemberChecklistItem[]): { done: number; total: number } {
  const done = items.filter((i) => i.ok).length;
  return { done, total: items.length };
}
