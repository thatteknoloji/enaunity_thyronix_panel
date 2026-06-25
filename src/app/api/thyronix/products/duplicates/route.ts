import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";
import { getThyronixDuplicateInsights } from "@/lib/thyronix/duplicate-insights";

const DUPLICATE_FIELDS = ["barcode", "stockCode", "modelCode", "externalId"] as const;
type DuplicateField = (typeof DUPLICATE_FIELDS)[number];

type DuplicateProductRow = {
  id: string;
  name: string;
  description?: string | null;
  brand: string | null;
  category: string | null;
  price: number;
  stock: number;
  status: string;
  barcode: string | null;
  stockCode: string | null;
  modelCode: string | null;
  externalId: string;
  image: string | null;
  createdAt: Date;
  source: { id: string; name: string };
};

function productMasterScore(product: DuplicateProductRow) {
  let score = 0;
  if (product.status === "active") score += 40;
  else if (product.status !== "excluded") score += 20;

  if (product.stock > 0) score += 15;
  if (product.image) score += 10;
  if (product.brand) score += 6;
  if (product.category) score += 6;
  if (product.description) score += 4;
  if (product.barcode) score += 4;
  if (product.stockCode) score += 3;
  if (product.modelCode) score += 3;
  if (product.price > 0) score += 4;

  const ageBonus = Math.max(0, 5 - Math.floor((Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)));
  score += ageBonus;

  return score;
}

function buildMasterReason(product: DuplicateProductRow) {
  const reasons: string[] = [];
  if (product.status === "active") reasons.push("aktif kayıt");
  if (product.stock > 0) reasons.push("stok var");
  if (product.image) reasons.push("görsel var");
  if (product.brand) reasons.push("marka dolu");
  if (product.category) reasons.push("kategori dolu");
  if (product.description) reasons.push("açıklama dolu");
  return reasons.slice(0, 4);
}

function isDuplicateField(value: string | null): value is DuplicateField {
  return Boolean(value && DUPLICATE_FIELDS.includes(value as DuplicateField));
}

function duplicateLabel(field: DuplicateField) {
  if (field === "barcode") return "Barkod";
  if (field === "stockCode") return "Stok kodu";
  if (field === "modelCode") return "Model kodu";
  return "Harici ID";
}

function buildFieldWhere(field: DuplicateField, value?: string) {
  const base = {
    AND: [
      { [field]: { not: null } },
      { NOT: { [field]: "" } },
    ],
  } as Record<string, unknown>;

  if (!value) return base;

  return {
    AND: [
      ...((base.AND as Record<string, unknown>[]) || []),
      { [field]: value },
    ],
  };
}

function summarizeGroup(field: DuplicateField, value: string, products: DuplicateProductRow[]) {
  const scoredProducts = [...products]
    .map((product) => ({
      ...product,
      masterScore: productMasterScore(product),
    }))
    .sort((a, b) => b.masterScore - a.masterScore || b.stock - a.stock || b.price - a.price);

  const suggestedMaster = scoredProducts[0];
  const sourceNames = Array.from(new Set(products.map((product) => product.source.name)));
  const statuses = Array.from(new Set(products.map((product) => product.status)));
  const prices = products.map((product) => product.price);
  const stocks = products.map((product) => product.stock);

  return {
    field,
    fieldLabel: duplicateLabel(field),
    value,
    count: products.length,
    sourceCount: sourceNames.length,
    sourceNames,
    statuses,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    totalStock: stocks.reduce((sum, item) => sum + item, 0),
    suggestedMasterId: suggestedMaster?.id || null,
    suggestedMasterReason: suggestedMaster ? buildMasterReason(suggestedMaster) : [],
    products: scoredProducts,
  };
}

export async function GET(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { searchParams } = new URL(req.url);
    const fieldParam = searchParams.get("field");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "18", 10), 1), 50);
    const types = isDuplicateField(fieldParam) ? [fieldParam] : [...DUPLICATE_FIELDS];
    const tenantWhere = withTenantFilter(user, {});

    const groupedResults = await Promise.all(
      types.map(async (field) => {
        const groups = await prisma.thyronixProduct.groupBy({
          by: [field],
          where: {
            AND: [
              tenantWhere,
              buildFieldWhere(field),
            ],
          },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: limit,
        });

        const filteredGroups = groups
          .map((group) => ({
            field,
            value: String(group[field] || ""),
            count: group._count.id,
          }))
          .filter((group) => group.value && group.count > 1);

        const detailedGroups = await Promise.all(
          filteredGroups.map(async (group) => {
            const products = await prisma.thyronixProduct.findMany({
              where: {
                AND: [
                  tenantWhere,
                  buildFieldWhere(field, group.value),
                ],
              },
              orderBy: [{ createdAt: "desc" }],
              take: 12,
              select: {
                id: true,
                name: true,
                description: true,
                brand: true,
                category: true,
                price: true,
                stock: true,
                status: true,
                barcode: true,
                stockCode: true,
                modelCode: true,
                externalId: true,
                image: true,
                createdAt: true,
                source: {
                  select: { id: true, name: true },
                },
              },
            });
            return summarizeGroup(field, group.value, products as DuplicateProductRow[]);
          }),
        );

        return detailedGroups;
      }),
    );

    const allGroups = groupedResults
      .flat()
      .sort((a, b) => b.count - a.count || b.sourceCount - a.sourceCount);

    const limitedGroups = isDuplicateField(fieldParam) ? allGroups.slice(0, limit) : allGroups.slice(0, limit);
    const totalAffectedProducts = limitedGroups.reduce((sum, group) => sum + group.count, 0);
    const crossSourceGroups = limitedGroups.filter((group) => group.sourceCount > 1).length;
    const insights = await getThyronixDuplicateInsights(tenantWhere);

    return NextResponse.json({
      success: true,
      data: {
        field: isDuplicateField(fieldParam) ? fieldParam : "all",
        groups: limitedGroups,
        summary: {
          groupCount: insights.totalGroups,
          affectedProducts: insights.totalAffectedProducts || totalAffectedProducts,
          crossSourceGroups,
          types: insights.byField.map((item) => ({
            field: item.field,
            label: duplicateLabel(item.field),
            groupCount: item.groupCount,
          })),
        },
      },
    });
  } catch (error) {
    return thyronixErrorResponse(error);
  }
}
