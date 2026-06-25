import { applyRounding, normalizeMeasurement } from "./measurement-engine";
import type { CalculatePricingResult, PricingBreakdownLine, PricingRuleWithRelations } from "./pricing-types";

type VariantRow = PricingRuleWithRelations["variants"][number];
type OptionRow = PricingRuleWithRelations["options"][number];

function applyVariantAdjustments(
  variants: VariantRow[],
  codes: string[],
  baseAmount: number
): { total: number; lines: PricingBreakdownLine[] } {
  const lines: PricingBreakdownLine[] = [];
  let total = 0;
  const selected = variants.filter((v) => v.isActive && codes.includes(v.code));
  for (const v of selected) {
    let amount = 0;
    if (v.adjustmentType === "FIXED") amount = v.adjustmentValue;
    else if (v.adjustmentType === "PERCENT") amount = (baseAmount * v.adjustmentValue) / 100;
    else if (v.adjustmentType === "MULTIPLIER") amount = baseAmount * (v.adjustmentValue - 1);
    total += amount;
    lines.push({ key: `variant:${v.code}`, label: `Varyant: ${v.name}`, amount });
  }
  return { total, lines };
}

function applyOptionAdjustments(
  options: OptionRow[],
  codes: string[],
  ctx: { baseAmount: number; areaM2: number; lengthMeter: number; quantity: number }
): { total: number; lines: PricingBreakdownLine[] } {
  const lines: PricingBreakdownLine[] = [];
  let total = 0;
  const selected = options.filter((o) => o.isActive && codes.includes(o.code));
  for (const o of selected) {
    let amount = 0;
    switch (o.adjustmentType) {
      case "FIXED":
        amount = o.adjustmentValue;
        break;
      case "PERCENT":
        amount = (ctx.baseAmount * o.adjustmentValue) / 100;
        break;
      case "PER_M2":
        amount = ctx.areaM2 * o.adjustmentValue;
        break;
      case "PER_METER":
        amount = ctx.lengthMeter * o.adjustmentValue;
        break;
      case "PER_PIECE":
        amount = ctx.quantity * o.adjustmentValue;
        break;
      default:
        amount = 0;
    }
    total += amount;
    lines.push({ key: `option:${o.code}`, label: `Opsiyon: ${o.name}`, amount });
  }
  return { total, lines };
}

function computeCustomFormula(
  rule: PricingRuleWithRelations,
  measurement: ReturnType<typeof normalizeMeasurement>
): { materialCost: number; baseComponent: number } {
  let params: Record<string, number> = {};
  try {
    params = JSON.parse(rule.formulaJson || "{}") as Record<string, number>;
  } catch {
    params = {};
  }
  const flatRate = Number(params.flatRate) || rule.basePrice;
  const perM2 = Number(params.perM2) || 0;
  const perPiece = Number(params.perPiece) || 0;
  const materialCost = measurement.areaM2 * perM2;
  const baseComponent = flatRate + perPiece * measurement.quantity + materialCost;
  return { materialCost, baseComponent };
}

export function calculatePricingFromRule(
  rule: PricingRuleWithRelations,
  input: {
    widthCm?: number;
    heightCm?: number;
    lengthMeter?: number;
    quantity?: number;
    variantCodes?: string[];
    optionCodes?: string[];
    customerType?: "RETAIL" | "DEALER";
  }
): CalculatePricingResult {
  const measurement = normalizeMeasurement(input);
  const variantCodes = input.variantCodes || [];
  const optionCodes = input.optionCodes || [];
  const customerType = input.customerType || "RETAIL";
  const currency = rule.material?.currency || "TRY";
  const breakdown: PricingBreakdownLine[] = [];

  let materialCost = 0;
  let baseCost = rule.basePrice;
  let wasteCost = 0;

  const laborCost = rule.laborCost;
  const printCost = rule.printCost;
  const cuttingCost = rule.cuttingCost;
  const packagingCost = rule.packagingCost;
  const shippingCost = rule.shippingCost;

  switch (rule.formulaType) {
    case "AREA_BASED": {
      materialCost = measurement.areaM2 * (rule.material?.baseCost || 0);
      wasteCost = (materialCost * rule.wastePercent) / 100;
      breakdown.push({ key: "areaM2", label: "Alan (m²)", amount: measurement.areaM2 });
      breakdown.push({ key: "materialCost", label: "Malzeme", amount: materialCost });
      if (wasteCost > 0) breakdown.push({ key: "wasteCost", label: "Fire", amount: wasteCost });
      break;
    }
    case "PIECE_BASED": {
      baseCost = rule.basePrice;
      breakdown.push({ key: "basePrice", label: "Birim fiyat", amount: baseCost });
      break;
    }
    case "METER_BASED": {
      materialCost = measurement.lengthMeter * (rule.material?.baseCost || 0);
      breakdown.push({ key: "lengthMeter", label: "Uzunluk (m)", amount: measurement.lengthMeter });
      breakdown.push({ key: "materialCost", label: "Malzeme", amount: materialCost });
      break;
    }
    case "FIXED": {
      baseCost = rule.basePrice;
      breakdown.push({ key: "fixedPrice", label: "Sabit fiyat", amount: baseCost });
      break;
    }
    case "CUSTOM_FORMULA": {
      const custom = computeCustomFormula(rule, measurement);
      materialCost = custom.materialCost;
      baseCost = custom.baseComponent;
      breakdown.push({ key: "customBase", label: "Özel formül tabanı", amount: baseCost });
      break;
    }
    default:
      break;
  }

  let subtotalCost = 0;
  if (rule.formulaType === "PIECE_BASED") {
    const unitBase = baseCost;
    const variantOnUnit = applyVariantAdjustments(rule.variants, variantCodes, unitBase);
    const optionOnUnit = applyOptionAdjustments(rule.options, optionCodes, {
      baseAmount: unitBase,
      areaM2: measurement.areaM2,
      lengthMeter: measurement.lengthMeter,
      quantity: 1,
    });
    const unitTotal = unitBase + variantOnUnit.total + optionOnUnit.total;
    subtotalCost =
      unitTotal * measurement.quantity + laborCost + printCost + cuttingCost + packagingCost + shippingCost;
    breakdown.push(...variantOnUnit.lines, ...optionOnUnit.lines);
    breakdown.push({ key: "quantity", label: "Adet", amount: measurement.quantity });
  } else if (rule.formulaType === "FIXED") {
    subtotalCost = baseCost + laborCost + printCost + cuttingCost + packagingCost + shippingCost;
  } else if (rule.formulaType === "CUSTOM_FORMULA") {
    subtotalCost =
      baseCost + laborCost + printCost + cuttingCost + packagingCost + shippingCost;
  } else {
    subtotalCost =
      materialCost + wasteCost + laborCost + printCost + cuttingCost + packagingCost + shippingCost;
  }

  let variantAdjustment = 0;
  let optionAdjustment = 0;

  if (rule.formulaType !== "PIECE_BASED") {
    const variantAdj = applyVariantAdjustments(rule.variants, variantCodes, subtotalCost);
    variantAdjustment = variantAdj.total;
    breakdown.push(...variantAdj.lines);
    const optionAdj = applyOptionAdjustments(rule.options, optionCodes, {
      baseAmount: subtotalCost,
      areaM2: measurement.areaM2,
      lengthMeter: measurement.lengthMeter,
      quantity: measurement.quantity,
    });
    optionAdjustment = optionAdj.total;
    breakdown.push(...optionAdj.lines);
    subtotalCost += variantAdjustment + optionAdjustment;
  }

  if (laborCost > 0) breakdown.push({ key: "laborCost", label: "İşçilik", amount: laborCost });
  if (printCost > 0) breakdown.push({ key: "printCost", label: "Baskı", amount: printCost });
  if (cuttingCost > 0) breakdown.push({ key: "cuttingCost", label: "Kesim", amount: cuttingCost });
  if (packagingCost > 0) breakdown.push({ key: "packagingCost", label: "Paketleme", amount: packagingCost });
  if (shippingCost > 0) breakdown.push({ key: "shippingCost", label: "Kargo", amount: shippingCost });

  breakdown.push({ key: "subtotalCost", label: "Ara toplam", amount: subtotalCost });

  const commissionAmount = (subtotalCost * rule.commissionPercent) / 100;
  const profitAmount = (subtotalCost * rule.profitPercent) / 100;
  const taxBase = subtotalCost + commissionAmount + profitAmount;
  const taxAmount = (taxBase * rule.taxPercent) / 100;

  if (commissionAmount > 0) breakdown.push({ key: "commission", label: "Komisyon", amount: commissionAmount });
  if (profitAmount > 0) breakdown.push({ key: "profit", label: "Kâr", amount: profitAmount });
  if (taxAmount > 0) breakdown.push({ key: "tax", label: "KDV", amount: taxAmount });

  let retailPrice = subtotalCost + commissionAmount + profitAmount + taxAmount;
  let dealerPrice = retailPrice - (retailPrice * rule.dealerDiscountPercent) / 100;
  let finalPrice = customerType === "DEALER" ? dealerPrice : retailPrice;

  if (rule.minPrice > 0 && finalPrice < rule.minPrice) {
    finalPrice = rule.minPrice;
    if (customerType === "DEALER") dealerPrice = rule.minPrice;
    else retailPrice = rule.minPrice;
    breakdown.push({ key: "minPrice", label: "Minimum fiyat uygulandı", amount: rule.minPrice });
  }

  finalPrice = applyRounding(finalPrice, rule.roundingMode);
  retailPrice = applyRounding(retailPrice, rule.roundingMode);
  dealerPrice = applyRounding(dealerPrice, rule.roundingMode);

  breakdown.push({ key: "retailPrice", label: "Perakende", amount: retailPrice });
  breakdown.push({ key: "dealerPrice", label: "Bayi", amount: dealerPrice });
  breakdown.push({ key: "finalPrice", label: "Son fiyat", amount: finalPrice });

  return {
    areaM2: measurement.areaM2,
    baseCost,
    materialCost,
    laborCost,
    printCost,
    cuttingCost,
    packagingCost,
    shippingCost,
    wasteCost,
    variantAdjustment,
    optionAdjustment,
    subtotalCost,
    commissionAmount,
    profitAmount,
    taxAmount,
    retailPrice,
    dealerPrice,
    finalPrice,
    currency,
    breakdown,
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleVersion: rule.version,
  };
}
