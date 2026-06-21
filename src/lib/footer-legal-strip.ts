import { prisma } from "@/lib/db";
import { TRUST_BADGE_LABELS, type TrustBadgeKey } from "./footer-trust-badges";

export type FooterLegalStripItemDTO = {
  id: string;
  label: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  active: boolean;
};

const DEFAULT_BADGE_KEYS: TrustBadgeKey[] = [
  "visa",
  "mastercard",
  "troy",
  "ssl",
  "3dsecure",
  "pci",
  "iyzico",
  "paytr",
];

export const DEFAULT_LEGAL_STRIP_ITEMS: Omit<FooterLegalStripItemDTO, "id">[] = DEFAULT_BADGE_KEYS.map(
  (key, sortOrder) => ({
    label: TRUST_BADGE_LABELS[key],
    imageUrl: "",
    linkUrl: "",
    sortOrder,
    active: true,
  })
);

export async function ensureDefaultLegalStripItems() {
  const existing = await prisma.footerLegalStripItem.findMany({
    select: { label: true },
  });
  const labels = new Set(existing.map((r) => r.label.toLowerCase()));

  for (const item of DEFAULT_LEGAL_STRIP_ITEMS) {
    if (labels.has(item.label.toLowerCase())) continue;
    await prisma.footerLegalStripItem.create({ data: item });
  }
}

export async function listActiveLegalStripItems(): Promise<FooterLegalStripItemDTO[]> {
  await ensureDefaultLegalStripItems();
  const rows = await prisma.footerLegalStripItem.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    imageUrl: r.imageUrl,
    linkUrl: r.linkUrl,
    sortOrder: r.sortOrder,
    active: r.active,
  }));
}

export async function listAllLegalStripItems(): Promise<FooterLegalStripItemDTO[]> {
  await ensureDefaultLegalStripItems();
  const rows = await prisma.footerLegalStripItem.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    imageUrl: r.imageUrl,
    linkUrl: r.linkUrl,
    sortOrder: r.sortOrder,
    active: r.active,
  }));
}
