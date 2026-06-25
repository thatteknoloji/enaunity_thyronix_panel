import { prisma } from "@/lib/db";

const DUPLICATE_FIELDS = ["barcode", "stockCode", "modelCode", "externalId"] as const;
export type ThyronixDuplicateField = (typeof DUPLICATE_FIELDS)[number];

function buildDuplicateWhere(field: ThyronixDuplicateField, baseWhere: Record<string, unknown>) {
  return {
    AND: [
      baseWhere,
      { [field]: { not: null } },
      { NOT: { [field]: "" } },
    ],
  };
}

export async function getThyronixDuplicateInsights(baseWhere: Record<string, unknown>) {
  const perField = await Promise.all(
    DUPLICATE_FIELDS.map(async (field) => {
      const groups = await prisma.thyronixProduct.groupBy({
        by: [field],
        where: buildDuplicateWhere(field, baseWhere),
        _count: { id: true },
      });

      const duplicateGroups = groups.filter((group) => String(group[field] || "") && group._count.id > 1);

      return {
        field,
        groupCount: duplicateGroups.length,
        affectedProducts: duplicateGroups.reduce((sum, group) => sum + group._count.id, 0),
      };
    }),
  );

  return {
    totalGroups: perField.reduce((sum, item) => sum + item.groupCount, 0),
    totalAffectedProducts: perField.reduce((sum, item) => sum + item.affectedProducts, 0),
    byField: perField,
  };
}
