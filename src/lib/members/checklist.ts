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

export const MEMBER_CHECKLIST_LABELS: Record<MemberChecklistKey, string> = {
  emailValid: "E-posta doğrulandı",
  identityVerified: "Kimlik / ad soyad doğrulandı",
  companyInfo: "Firma bilgileri tam",
  taxInfo: "Vergi no & vergi dairesi",
  phoneVerified: "Telefon doğrulandı",
  kvkkAccepted: "KVKK onaylandı",
  contractsSigned: "Üyelik sözleşmeleri imzalandı",
  documentsUploaded: "Gerekli evraklar yüklendi",
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  pending: "Onay Bekliyor",
  active: "Aktif",
  rejected: "Reddedildi",
  suspended: "Askıda",
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
