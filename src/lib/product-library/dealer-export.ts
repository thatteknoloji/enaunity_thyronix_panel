import { prisma } from "@/lib/db";
import { dealerCanAccessPackage } from "./access";
import { exportPackageItems } from "./export";
import { getPackageItems } from "./items";
import { buildRecipeExportRows } from "./recipe-engine";
import { resolvePackageTemplate } from "./template-engine";
import { DISTRIBUTION_FORMATS, type DistributionFormat } from "./types";

const FORMAT_SET = new Set<string>(DISTRIBUTION_FORMATS);

function normalizeFormat(value: string | undefined, fallback: DistributionFormat): DistributionFormat {
  const normalized = String(value || fallback).toUpperCase();
  if (!FORMAT_SET.has(normalized)) {
    throw new Error("Desteklenmeyen çıktı formatı");
  }
  return normalized as DistributionFormat;
}

function safeRecipeFileSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export async function buildDealerPackageExport(params: {
  dealerId: string;
  packageId: string;
  recipeId?: string;
  format?: string;
}) {
  const access = await dealerCanAccessPackage(params.dealerId, params.packageId);
  if (!access.ok) {
    throw new Error("Paket erişimi yok");
  }

  const items = await getPackageItems(params.packageId);
  const template = resolvePackageTemplate(access.pkg, items);
  let format = normalizeFormat(params.format, "EXCEL");
  let recipe = null as Awaited<ReturnType<typeof prisma.productPackageRecipe.findFirst>>;
  let recipeName = "";
  let storeName = "";
  let exportRows: Array<Record<string, string | number>> | typeof items = items;

  if (params.recipeId) {
    recipe = await prisma.productPackageRecipe.findFirst({
      where: {
        id: params.recipeId,
        packageId: params.packageId,
        dealerId: params.dealerId,
        status: "ACTIVE",
      },
    });
    if (!recipe) {
      throw new Error("Reçete bulunamadı");
    }
    format = normalizeFormat(params.format || recipe.format, "EXCEL");
    recipeName = recipe.name;
    storeName = recipe.storeName || recipe.connectionLabel || "";
    const values = JSON.parse(recipe.valuesJson || "{}");
    exportRows = buildRecipeExportRows({
      items,
      fieldRules: template.fieldRules,
      recipeValues: values,
    }).rows;
  }

  if (!template.exportFormats.includes(format)) {
    throw new Error("Bu paket için seçilen çıktı formatı aktif değil");
  }

  const exported = exportPackageItems(exportRows, format);
  const fileName = recipeName
    ? `${access.pkg.slug}-${safeRecipeFileSegment(recipeName) || "recipe"}.${exported.extension}`
    : `${access.pkg.slug}.${exported.extension}`;

  return {
    access,
    items,
    template,
    recipe,
    format,
    recipeName,
    storeName,
    exportRows,
    exported,
    fileName,
    itemCount: Array.isArray(exportRows) ? exportRows.length : 0,
  };
}
