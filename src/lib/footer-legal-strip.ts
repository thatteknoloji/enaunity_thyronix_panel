import { prisma } from "@/lib/db";

export type FooterLegalStripItemDTO = {
  id: string;
  label: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  active: boolean;
};

export const DEFAULT_LEGAL_STRIP_ITEMS: Omit<FooterLegalStripItemDTO, "id">[] = [
  { label: "256 Bit SSL & 3D Secure", imageUrl: "", linkUrl: "", sortOrder: 0, active: true },
];

export async function ensureDefaultLegalStripItems() {
  const count = await prisma.footerLegalStripItem.count();
  if (count > 0) return;
  for (const item of DEFAULT_LEGAL_STRIP_ITEMS) {
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
