export const PRICING_ENGINE_VERSION = "ENA_PRICING_ENGINE_V1" as const;

export type PricingMaterialUnit = "M2" | "CM2" | "PIECE" | "METER" | "KG" | "LITER";
export type PricingProductType =
  | "GLASS_PRINT"
  | "MDF_PRINT"
  | "CANVAS"
  | "CARPET"
  | "RUG"
  | "DOORMAT"
  | "CURTAIN"
  | "DTF"
  | "UV_PRINT"
  | "SUBLIMATION"
  | "TSHIRT"
  | "MUG"
  | "PUZZLE"
  | "PLEXI"
  | "WOOD"
  | "STICKER"
  | "POSTER"
  | "CUSTOM";

export type PricingFormulaType = "AREA_BASED" | "PIECE_BASED" | "METER_BASED" | "FIXED" | "CUSTOM_FORMULA";
export type PricingRoundingMode = "NONE" | "NEAREST_1" | "NEAREST_5" | "NEAREST_10" | "NEAREST_50" | "NEAREST_100";
export type PricingRuleStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type PricingAdjustmentType = "FIXED" | "PERCENT" | "MULTIPLIER";
export type PricingOptionAdjustmentType = "FIXED" | "PERCENT" | "PER_M2" | "PER_METER" | "PER_PIECE";
export type PricingCustomerType = "RETAIL" | "DEALER";

export type PricingBreakdownLine = {
  key: string;
  label: string;
  amount: number;
};

export type CalculatePricingInput = {
  ruleCode: string;
  catalogId?: string;
  sizeVariantKey?: string;
  widthCm?: number;
  heightCm?: number;
  lengthMeter?: number;
  quantity?: number;
  variantCodes?: string[];
  optionCodes?: string[];
  customerType?: PricingCustomerType;
  sourceType?: string;
  sourceReferenceId?: string;
  writeLog?: boolean;
};

export type CalculatePricingResult = {
  areaM2: number;
  baseCost: number;
  materialCost: number;
  laborCost: number;
  printCost: number;
  cuttingCost: number;
  packagingCost: number;
  shippingCost: number;
  wasteCost: number;
  variantAdjustment: number;
  optionAdjustment: number;
  subtotalCost: number;
  commissionAmount: number;
  profitAmount: number;
  taxAmount: number;
  retailPrice: number;
  dealerPrice: number;
  finalPrice: number;
  currency: string;
  breakdown: PricingBreakdownLine[];
  ruleId: string;
  ruleCode: string;
  ruleVersion: number;
};

export type PricingRuleWithRelations = {
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
  material?: {
    id: string;
    name: string;
    code: string;
    unit: string;
    baseCost: number;
    currency: string;
  } | null;
  variants: Array<{
    id: string;
    code: string;
    name: string;
    adjustmentType: string;
    adjustmentValue: number;
    isActive: boolean;
  }>;
  options: Array<{
    id: string;
    code: string;
    name: string;
    adjustmentType: string;
    adjustmentValue: number;
    isActive: boolean;
  }>;
};

export type CreatePricingMaterialInput = {
  name: string;
  code: string;
  unit: PricingMaterialUnit;
  baseCost: number;
  currency?: string;
  metadataJson?: Record<string, unknown>;
  isActive?: boolean;
};

export type CreatePricingRuleInput = {
  name: string;
  code: string;
  productType: PricingProductType;
  materialId?: string | null;
  formulaType: PricingFormulaType;
  basePrice?: number;
  minPrice?: number;
  wastePercent?: number;
  laborCost?: number;
  printCost?: number;
  cuttingCost?: number;
  packagingCost?: number;
  shippingCost?: number;
  commissionPercent?: number;
  profitPercent?: number;
  dealerDiscountPercent?: number;
  taxPercent?: number;
  roundingMode?: PricingRoundingMode;
  formulaJson?: Record<string, unknown>;
  metadataJson?: Record<string, unknown>;
};

export type CreatePricingVariantInput = {
  ruleId: string;
  name: string;
  code: string;
  adjustmentType: PricingAdjustmentType;
  adjustmentValue: number;
  metadataJson?: Record<string, unknown>;
  isActive?: boolean;
};

export type CreatePricingOptionInput = {
  ruleId: string;
  name: string;
  code: string;
  adjustmentType: PricingOptionAdjustmentType;
  adjustmentValue: number;
  metadataJson?: Record<string, unknown>;
  isActive?: boolean;
};

export type PricingDashboard = {
  materialCount: number;
  activeMaterialCount: number;
  ruleCount: number;
  activeRuleCount: number;
  draftRuleCount: number;
  variantCount: number;
  optionCount: number;
  logCount: number;
  recentLogs: Array<{
    id: string;
    ruleCode: string | null;
    finalPrice: number;
    createdAt: string;
  }>;
};
