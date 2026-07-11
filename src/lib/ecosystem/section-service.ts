import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { EcosystemShowcaseSettings } from "@prisma/client";
import {
  DEFAULT_ECOSYSTEM_SECTION,
  type EcosystemShowcaseSettingsDTO,
} from "./section-settings";

function toSectionDTO(row: EcosystemShowcaseSettings): EcosystemShowcaseSettingsDTO {
  return {
    id: row.id,
    enabled: row.enabled,
    badgeText: row.badgeText,
    title: row.title,
    description: row.description,
    columns: row.columns,
    anchorId: row.anchorId,
    bgPrimaryColor: row.bgPrimaryColor,
    bgSecondaryColor: row.bgSecondaryColor,
    paddingTop: row.paddingTop,
    paddingBottom: row.paddingBottom,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getEcosystemSectionSettings(): Promise<EcosystemShowcaseSettingsDTO> {
  let row = await prisma.ecosystemShowcaseSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    row = await prisma.ecosystemShowcaseSettings.create({
      data: { id: "default", ...DEFAULT_ECOSYSTEM_SECTION },
    });
  }
  return toSectionDTO(row);
}

export async function updateEcosystemSectionSettings(
  input: Partial<EcosystemShowcaseSettingsDTO>
): Promise<EcosystemShowcaseSettingsDTO> {
  const row = await prisma.ecosystemShowcaseSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...DEFAULT_ECOSYSTEM_SECTION, ...input },
    update: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.badgeText !== undefined ? { badgeText: input.badgeText } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.columns !== undefined ? { columns: Math.min(4, Math.max(1, input.columns)) } : {}),
      ...(input.anchorId !== undefined ? { anchorId: input.anchorId } : {}),
      ...(input.bgPrimaryColor !== undefined ? { bgPrimaryColor: input.bgPrimaryColor } : {}),
      ...(input.bgSecondaryColor !== undefined ? { bgSecondaryColor: input.bgSecondaryColor } : {}),
      ...(input.paddingTop !== undefined ? { paddingTop: input.paddingTop } : {}),
      ...(input.paddingBottom !== undefined ? { paddingBottom: input.paddingBottom } : {}),
    },
  });
  revalidatePath("/");
  return toSectionDTO(row);
}
