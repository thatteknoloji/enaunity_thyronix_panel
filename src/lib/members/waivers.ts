import {
  MEMBER_CHECKLIST_KEYS,
  MEMBER_REQUIRED_DOCUMENTS,
  type MemberChecklistItem,
  type MemberChecklistKey,
} from "./checklist";

export type AdminApprovalWaivers = {
  checklistKeys: MemberChecklistKey[];
  documentTypes: (typeof MEMBER_REQUIRED_DOCUMENTS)[number][];
};

export const EMPTY_ADMIN_WAIVERS: AdminApprovalWaivers = {
  checklistKeys: [],
  documentTypes: [],
};

export function parseAdminWaivers(raw: string | null | undefined): AdminApprovalWaivers {
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    const checklistKeys = Array.isArray(parsed.checklistKeys)
      ? parsed.checklistKeys.filter((k: string) =>
          (MEMBER_CHECKLIST_KEYS as readonly string[]).includes(k)
        )
      : [];
    const documentTypes = Array.isArray(parsed.documentTypes)
      ? parsed.documentTypes.filter((t: string) =>
          (MEMBER_REQUIRED_DOCUMENTS as readonly string[]).includes(t)
        )
      : [];
    return { checklistKeys, documentTypes };
  } catch {
    return { ...EMPTY_ADMIN_WAIVERS };
  }
}

export function applyAdminWaivers(
  checklist: MemberChecklistItem[],
  waivers: AdminApprovalWaivers,
  documents: { type: string; status: string }[]
): MemberChecklistItem[] {
  const waivedDocSet = new Set(waivers.documentTypes);
  const approvedDocs = new Set(documents.filter((d) => d.status === "approved").map((d) => d.type));
  const requiredDocTypes = MEMBER_REQUIRED_DOCUMENTS.filter((t) => !waivedDocSet.has(t));
  const documentsOk =
    waivers.checklistKeys.includes("documentsUploaded") ||
    requiredDocTypes.length === 0 ||
    requiredDocTypes.every((t) => approvedDocs.has(t));

  return checklist.map((item) => {
    if (waivers.checklistKeys.includes(item.key)) {
      return {
        ...item,
        ok: true,
        waived: true,
        detail: `${item.detail} · Admin muaf tuttu`,
      };
    }

    if (item.key === "documentsUploaded") {
      const detailParts = MEMBER_REQUIRED_DOCUMENTS.map((t) => {
        if (waivedDocSet.has(t)) return `${t}: muaf`;
        if (approvedDocs.has(t)) return `${t}: onaylı`;
        if (documents.some((d) => d.type === t)) return `${t}: inceleme bekliyor`;
        return `${t}: yüklenmedi`;
      });
      return {
        ...item,
        ok: documentsOk,
        detail: documentsOk ? "Gerekli evraklar tamam (muafiyetler dahil)" : detailParts.join(" · "),
      };
    }

    return item;
  });
}

export function isAdminApprovalReady(
  checklist: MemberChecklistItem[],
  waivers: AdminApprovalWaivers
): boolean {
  const applied = applyAdminWaivers(checklist, waivers, []);
  // Re-apply with empty docs won't work for documents - caller should pass applied checklist
  return applied.every((i) => i.ok);
}

export function isChecklistReadyForAdmin(
  checklist: MemberChecklistItem[],
  waivers: AdminApprovalWaivers,
  documents: { type: string; status: string }[]
): boolean {
  return applyAdminWaivers(checklist, waivers, documents).every((i) => i.ok);
}
