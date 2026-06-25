import { prisma } from "@/lib/db";

type SeedMaterial = {
  code: string;
  name: string;
  unit: "M2" | "PIECE" | "METER";
  baseCost: number;
};

type SeedRule = {
  code: string;
  name: string;
  productType: string;
  formulaType: "AREA_BASED" | "PIECE_BASED" | "METER_BASED" | "FIXED";
  materialCode?: string;
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
  roundingMode?: "NONE" | "NEAREST_1" | "NEAREST_5" | "NEAREST_10" | "NEAREST_50" | "NEAREST_100";
};

const MATERIALS: SeedMaterial[] = [
  { code: "GLASS_M2", name: "Cam Baskı Malzemesi", unit: "M2", baseCost: 450 },
  { code: "MDF_M2", name: "MDF Baskı Malzemesi", unit: "M2", baseCost: 320 },
  { code: "CANVAS_M2", name: "Kanvas Kumaş", unit: "M2", baseCost: 280 },
  { code: "CARPET_M2", name: "Halı Malzemesi", unit: "M2", baseCost: 390 },
  { code: "CURTAIN_METER", name: "Perde Kumaşı", unit: "METER", baseCost: 185 },
  { code: "DTF_PIECE", name: "DTF Transfer", unit: "PIECE", baseCost: 35 },
  { code: "UV_M2", name: "UV Baskı Malzemesi", unit: "M2", baseCost: 410 },
  { code: "MUG_PIECE", name: "Kupa Blank", unit: "PIECE", baseCost: 42 },
  { code: "STICKER_M2", name: "Sticker Vinil", unit: "M2", baseCost: 220 },
  { code: "POSTER_M2", name: "Poster Kağıdı", unit: "M2", baseCost: 95 },
];

const RULES: SeedRule[] = [
  {
    code: "GLASS_PRINT_M2_V1",
    name: "Cam Tablo m² Fiyatı",
    productType: "GLASS_PRINT",
    formulaType: "AREA_BASED",
    materialCode: "GLASS_M2",
    wastePercent: 8,
    laborCost: 120,
    printCost: 180,
    cuttingCost: 60,
    packagingCost: 45,
    shippingCost: 0,
    commissionPercent: 5,
    profitPercent: 25,
    dealerDiscountPercent: 12,
    minPrice: 500,
    roundingMode: "NEAREST_10",
  },
  {
    code: "MDF_PRINT_M2_V1",
    name: "MDF Baskı m² Fiyatı",
    productType: "MDF_PRINT",
    formulaType: "AREA_BASED",
    materialCode: "MDF_M2",
    wastePercent: 6,
    laborCost: 90,
    printCost: 140,
    cuttingCost: 50,
    packagingCost: 40,
    commissionPercent: 5,
    profitPercent: 22,
    dealerDiscountPercent: 10,
    minPrice: 350,
    roundingMode: "NEAREST_10",
  },
  {
    code: "CANVAS_M2_V1",
    name: "Kanvas Tablo m² Fiyatı",
    productType: "CANVAS",
    formulaType: "AREA_BASED",
    materialCode: "CANVAS_M2",
    wastePercent: 5,
    laborCost: 80,
    printCost: 120,
    packagingCost: 35,
    profitPercent: 20,
    dealerDiscountPercent: 10,
    minPrice: 300,
  },
  {
    code: "CARPET_M2_V1",
    name: "Halı Baskı m² Fiyatı",
    productType: "CARPET",
    formulaType: "AREA_BASED",
    materialCode: "CARPET_M2",
    wastePercent: 10,
    laborCost: 100,
    printCost: 160,
    packagingCost: 55,
    profitPercent: 24,
    dealerDiscountPercent: 11,
    minPrice: 400,
  },
  {
    code: "CURTAIN_METER_V1",
    name: "Perde Metre Fiyatı",
    productType: "CURTAIN",
    formulaType: "METER_BASED",
    materialCode: "CURTAIN_METER",
    laborCost: 70,
    printCost: 90,
    packagingCost: 30,
    profitPercent: 20,
    dealerDiscountPercent: 8,
    minPrice: 250,
  },
  {
    code: "DTF_PIECE_V1",
    name: "DTF Adet Fiyatı",
    productType: "DTF",
    formulaType: "PIECE_BASED",
    materialCode: "DTF_PIECE",
    basePrice: 85,
    laborCost: 15,
    printCost: 25,
    packagingCost: 5,
    profitPercent: 18,
    dealerDiscountPercent: 10,
    minPrice: 75,
  },
  {
    code: "UV_PRINT_M2_V1",
    name: "UV Baskı m² Fiyatı",
    productType: "UV_PRINT",
    formulaType: "AREA_BASED",
    materialCode: "UV_M2",
    wastePercent: 7,
    laborCost: 95,
    printCost: 150,
    profitPercent: 23,
    dealerDiscountPercent: 10,
    minPrice: 380,
  },
  {
    code: "MUG_PIECE_V1",
    name: "Kupa Adet Fiyatı",
    productType: "MUG",
    formulaType: "PIECE_BASED",
    materialCode: "MUG_PIECE",
    basePrice: 95,
    laborCost: 12,
    printCost: 18,
    packagingCost: 8,
    profitPercent: 20,
    dealerDiscountPercent: 12,
    minPrice: 89,
    roundingMode: "NEAREST_5",
  },
  {
    code: "STICKER_M2_V1",
    name: "Sticker m² Fiyatı",
    productType: "STICKER",
    formulaType: "AREA_BASED",
    materialCode: "STICKER_M2",
    wastePercent: 4,
    laborCost: 40,
    printCost: 70,
    cuttingCost: 30,
    profitPercent: 18,
    dealerDiscountPercent: 8,
    minPrice: 150,
  },
  {
    code: "POSTER_M2_V1",
    name: "Poster m² Fiyatı",
    productType: "POSTER",
    formulaType: "AREA_BASED",
    materialCode: "POSTER_M2",
    wastePercent: 3,
    laborCost: 25,
    printCost: 45,
    profitPercent: 15,
    dealerDiscountPercent: 7,
    minPrice: 120,
  },
];

export async function seedDefaultPricingRules() {
  const materialIds: Record<string, string> = {};

  for (const m of MATERIALS) {
    const existing = await prisma.pricingMaterial.findUnique({ where: { code: m.code } });
    if (existing) {
      materialIds[m.code] = existing.id;
      continue;
    }
    const created = await prisma.pricingMaterial.create({
      data: {
        code: m.code,
        name: m.name,
        unit: m.unit,
        baseCost: m.baseCost,
        currency: "TRY",
        isActive: true,
      },
    });
    materialIds[m.code] = created.id;
  }

  let createdRules = 0;
  for (const r of RULES) {
    const existing = await prisma.pricingRule.findUnique({ where: { code: r.code } });
    if (existing) continue;

    await prisma.pricingRule.create({
      data: {
        code: r.code,
        name: r.name,
        productType: r.productType as never,
        formulaType: r.formulaType as never,
        materialId: r.materialCode ? materialIds[r.materialCode] : null,
        basePrice: r.basePrice || 0,
        minPrice: r.minPrice || 0,
        wastePercent: r.wastePercent || 0,
        laborCost: r.laborCost || 0,
        printCost: r.printCost || 0,
        cuttingCost: r.cuttingCost || 0,
        packagingCost: r.packagingCost || 0,
        shippingCost: r.shippingCost || 0,
        commissionPercent: r.commissionPercent || 0,
        profitPercent: r.profitPercent || 0,
        dealerDiscountPercent: r.dealerDiscountPercent || 0,
        taxPercent: r.taxPercent ?? 20,
        roundingMode: (r.roundingMode || "NONE") as never,
        status: "ACTIVE",
        version: 1,
      },
    });
    createdRules++;
  }

  return { materials: MATERIALS.length, rules: RULES.length, createdRules };
}
