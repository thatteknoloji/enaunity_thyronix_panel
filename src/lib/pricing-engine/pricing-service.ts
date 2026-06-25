import { prisma } from "@/lib/db";
import { tryCalculateFromCatalog } from "./catalog-pricing-engine";
import { calculatePricingFromRule } from "./formula-engine";
import { seedDefaultPricingRules } from "./pricing-seed";
import type {
  CalculatePricingInput,
  CalculatePricingResult,
  CreatePricingMaterialInput,
  CreatePricingOptionInput,
  CreatePricingRuleInput,
  CreatePricingVariantInput,
  PricingDashboard,
  PricingRuleWithRelations,
} from "./pricing-types";

const ruleInclude = {
  material: true,
  variants: { orderBy: { createdAt: "asc" as const } },
  options: { orderBy: { createdAt: "asc" as const } },
};

function mapRule(row: {
  id: string;
  name: string;
  code: string;
  productType: string;
  materialId: string | null;
  formulaType: string;
  basePrice: number;
  minPrice: number;
  wastePercent: number;
  laborCost: number;
  printCost: number;
  cuttingCost: number;
  packagingCost: number;
  shippingCost: number;
  commissionPercent: number;
  profitPercent: number;
  dealerDiscountPercent: number;
  taxPercent: number;
  roundingMode: string;
  formulaJson: string;
  metadataJson: string;
  version: number;
  status: string;
  material?: PricingRuleWithRelations["material"];
  variants: PricingRuleWithRelations["variants"];
  options: PricingRuleWithRelations["options"];
}): PricingRuleWithRelations {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    productType: row.productType,
    materialId: row.materialId,
    formulaType: row.formulaType,
    basePrice: row.basePrice,
    minPrice: row.minPrice,
    wastePercent: row.wastePercent,
    laborCost: row.laborCost,
    printCost: row.printCost,
    cuttingCost: row.cuttingCost,
    packagingCost: row.packagingCost,
    shippingCost: row.shippingCost,
    commissionPercent: row.commissionPercent,
    profitPercent: row.profitPercent,
    dealerDiscountPercent: row.dealerDiscountPercent,
    taxPercent: row.taxPercent,
    roundingMode: row.roundingMode,
    formulaJson: row.formulaJson,
    metadataJson: row.metadataJson,
    version: row.version,
    status: row.status,
    material: row.material
      ? {
          id: row.material.id,
          name: row.material.name,
          code: row.material.code,
          unit: row.material.unit,
          baseCost: row.material.baseCost,
          currency: row.material.currency,
        }
      : null,
    variants: row.variants.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      adjustmentType: v.adjustmentType,
      adjustmentValue: v.adjustmentValue,
      isActive: v.isActive,
    })),
    options: row.options.map((o) => ({
      id: o.id,
      code: o.code,
      name: o.name,
      adjustmentType: o.adjustmentType,
      adjustmentValue: o.adjustmentValue,
      isActive: o.isActive,
    })),
  };
}

export async function listPricingMaterials() {
  return prisma.pricingMaterial.findMany({ orderBy: { name: "asc" } });
}

export async function listPricingRules(status?: string) {
  const rows = await prisma.pricingRule.findMany({
    where: status ? { status: status as "DRAFT" | "ACTIVE" | "ARCHIVED" } : undefined,
    include: ruleInclude,
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return rows.map(mapRule);
}

export async function getPricingRule(idOrCode: string) {
  const row = await prisma.pricingRule.findFirst({
    where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
    include: ruleInclude,
  });
  return row ? mapRule(row) : null;
}

export async function createPricingMaterial(input: CreatePricingMaterialInput) {
  return prisma.pricingMaterial.create({
    data: {
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      unit: input.unit,
      baseCost: Number(input.baseCost) || 0,
      currency: input.currency || "TRY",
      metadataJson: JSON.stringify(input.metadataJson || {}),
      isActive: input.isActive !== false,
    },
  });
}

export async function updatePricingMaterial(
  id: string,
  input: Partial<CreatePricingMaterialInput>
) {
  return prisma.pricingMaterial.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.baseCost !== undefined ? { baseCost: Number(input.baseCost) || 0 } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.metadataJson !== undefined ? { metadataJson: JSON.stringify(input.metadataJson) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function createPricingRule(input: CreatePricingRuleInput) {
  return prisma.pricingRule.create({
    data: {
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      productType: input.productType,
      materialId: input.materialId || null,
      formulaType: input.formulaType,
      basePrice: Number(input.basePrice) || 0,
      minPrice: Number(input.minPrice) || 0,
      wastePercent: Number(input.wastePercent) || 0,
      laborCost: Number(input.laborCost) || 0,
      printCost: Number(input.printCost) || 0,
      cuttingCost: Number(input.cuttingCost) || 0,
      packagingCost: Number(input.packagingCost) || 0,
      shippingCost: Number(input.shippingCost) || 0,
      commissionPercent: Number(input.commissionPercent) || 0,
      profitPercent: Number(input.profitPercent) || 0,
      dealerDiscountPercent: Number(input.dealerDiscountPercent) || 0,
      taxPercent: input.taxPercent !== undefined ? Number(input.taxPercent) : 20,
      roundingMode: input.roundingMode || "NONE",
      formulaJson: JSON.stringify(input.formulaJson || {}),
      metadataJson: JSON.stringify(input.metadataJson || {}),
      status: "DRAFT",
    },
    include: ruleInclude,
  });
}

export async function updatePricingRule(id: string, input: Partial<CreatePricingRuleInput>) {
  return prisma.pricingRule.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.productType !== undefined ? { productType: input.productType } : {}),
      ...(input.materialId !== undefined ? { materialId: input.materialId || null } : {}),
      ...(input.formulaType !== undefined ? { formulaType: input.formulaType } : {}),
      ...(input.basePrice !== undefined ? { basePrice: Number(input.basePrice) || 0 } : {}),
      ...(input.minPrice !== undefined ? { minPrice: Number(input.minPrice) || 0 } : {}),
      ...(input.wastePercent !== undefined ? { wastePercent: Number(input.wastePercent) || 0 } : {}),
      ...(input.laborCost !== undefined ? { laborCost: Number(input.laborCost) || 0 } : {}),
      ...(input.printCost !== undefined ? { printCost: Number(input.printCost) || 0 } : {}),
      ...(input.cuttingCost !== undefined ? { cuttingCost: Number(input.cuttingCost) || 0 } : {}),
      ...(input.packagingCost !== undefined ? { packagingCost: Number(input.packagingCost) || 0 } : {}),
      ...(input.shippingCost !== undefined ? { shippingCost: Number(input.shippingCost) || 0 } : {}),
      ...(input.commissionPercent !== undefined ? { commissionPercent: Number(input.commissionPercent) || 0 } : {}),
      ...(input.profitPercent !== undefined ? { profitPercent: Number(input.profitPercent) || 0 } : {}),
      ...(input.dealerDiscountPercent !== undefined ? { dealerDiscountPercent: Number(input.dealerDiscountPercent) || 0 } : {}),
      ...(input.taxPercent !== undefined ? { taxPercent: Number(input.taxPercent) || 0 } : {}),
      ...(input.roundingMode !== undefined ? { roundingMode: input.roundingMode } : {}),
      ...(input.formulaJson !== undefined ? { formulaJson: JSON.stringify(input.formulaJson) } : {}),
      ...(input.metadataJson !== undefined ? { metadataJson: JSON.stringify(input.metadataJson) } : {}),
    },
    include: ruleInclude,
  });
}

export async function publishPricingRule(id: string) {
  return prisma.pricingRule.update({
    where: { id },
    data: { status: "ACTIVE", version: { increment: 1 } },
    include: ruleInclude,
  });
}

export async function archivePricingRule(id: string) {
  return prisma.pricingRule.update({
    where: { id },
    data: { status: "ARCHIVED" },
    include: ruleInclude,
  });
}

export async function createPricingVariant(input: CreatePricingVariantInput) {
  return prisma.pricingVariant.create({
    data: {
      ruleId: input.ruleId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      adjustmentType: input.adjustmentType,
      adjustmentValue: Number(input.adjustmentValue) || 0,
      metadataJson: JSON.stringify(input.metadataJson || {}),
      isActive: input.isActive !== false,
    },
  });
}

export async function updatePricingVariant(
  id: string,
  input: Partial<Omit<CreatePricingVariantInput, "ruleId">>
) {
  return prisma.pricingVariant.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.adjustmentType !== undefined ? { adjustmentType: input.adjustmentType } : {}),
      ...(input.adjustmentValue !== undefined ? { adjustmentValue: Number(input.adjustmentValue) || 0 } : {}),
      ...(input.metadataJson !== undefined ? { metadataJson: JSON.stringify(input.metadataJson) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function createPricingOption(input: CreatePricingOptionInput) {
  return prisma.pricingOption.create({
    data: {
      ruleId: input.ruleId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      adjustmentType: input.adjustmentType,
      adjustmentValue: Number(input.adjustmentValue) || 0,
      metadataJson: JSON.stringify(input.metadataJson || {}),
      isActive: input.isActive !== false,
    },
  });
}

export async function updatePricingOption(
  id: string,
  input: Partial<Omit<CreatePricingOptionInput, "ruleId">>
) {
  return prisma.pricingOption.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.adjustmentType !== undefined ? { adjustmentType: input.adjustmentType } : {}),
      ...(input.adjustmentValue !== undefined ? { adjustmentValue: Number(input.adjustmentValue) || 0 } : {}),
      ...(input.metadataJson !== undefined ? { metadataJson: JSON.stringify(input.metadataJson) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function listPricingCalculationLogs(limit = 50) {
  return prisma.pricingCalculationLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { rule: { select: { code: true, name: true } } },
  });
}

export async function getPricingDashboard(): Promise<PricingDashboard> {
  const [materialCount, activeMaterialCount, ruleCount, activeRuleCount, draftRuleCount, variantCount, optionCount, logCount, recentLogs] =
    await Promise.all([
      prisma.pricingMaterial.count(),
      prisma.pricingMaterial.count({ where: { isActive: true } }),
      prisma.pricingRule.count(),
      prisma.pricingRule.count({ where: { status: "ACTIVE" } }),
      prisma.pricingRule.count({ where: { status: "DRAFT" } }),
      prisma.pricingVariant.count(),
      prisma.pricingOption.count(),
      prisma.pricingCalculationLog.count(),
      prisma.pricingCalculationLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { rule: { select: { code: true } } },
      }),
    ]);

  return {
    materialCount,
    activeMaterialCount,
    ruleCount,
    activeRuleCount,
    draftRuleCount,
    variantCount,
    optionCount,
    logCount,
    recentLogs: recentLogs.map((log) => {
      let finalPrice = 0;
      try {
        const parsed = JSON.parse(log.resultJson) as { finalPrice?: number };
        finalPrice = parsed.finalPrice || 0;
      } catch {
        finalPrice = 0;
      }
      return {
        id: log.id,
        ruleCode: log.rule?.code || null,
        finalPrice,
        createdAt: log.createdAt.toISOString(),
      };
    }),
  };
}

export async function calculatePricing(input: CalculatePricingInput): Promise<CalculatePricingResult> {
  const catalogResult = tryCalculateFromCatalog(input);
  if (catalogResult) {
    if (input.writeLog !== false) {
      await prisma.pricingCalculationLog.create({
        data: {
          ruleId: null,
          inputJson: JSON.stringify(input),
          resultJson: JSON.stringify(catalogResult),
          sourceType: input.sourceType || "CATALOG",
          sourceReferenceId: input.sourceReferenceId || catalogResult.ruleId,
        },
      });
    }
    return catalogResult;
  }

  const rule = await getPricingRule(input.ruleCode);
  if (!rule) throw new Error(`Fiyat kuralı bulunamadı: ${input.ruleCode}`);
  if (rule.status !== "ACTIVE") throw new Error(`Fiyat kuralı aktif değil: ${input.ruleCode}`);

  const result = calculatePricingFromRule(rule, {
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    lengthMeter: input.lengthMeter,
    quantity: input.quantity,
    variantCodes: input.variantCodes,
    optionCodes: input.optionCodes,
    customerType: input.customerType || "RETAIL",
  });

  if (input.writeLog !== false) {
    await prisma.pricingCalculationLog.create({
      data: {
        ruleId: rule.id,
        inputJson: JSON.stringify(input),
        resultJson: JSON.stringify(result),
        sourceType: input.sourceType || null,
        sourceReferenceId: input.sourceReferenceId || null,
      },
    });
  }

  return result;
}

export { seedDefaultPricingRules };
