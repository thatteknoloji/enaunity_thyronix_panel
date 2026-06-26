import { applyRounding } from "./measurement-engine";
import type { PricingRoundingMode } from "./pricing-types";

export type CatalogPricingMode = "FIXED_SIZE" | "AREA_M2" | "PIECE";

export type CatalogFixedSize = {
  widthCm: number;
  heightCm: number;
  label: string;
  salePrice: number;
  basePrice?: number;
  /** round | pack4 | teona1 vb. */
  variantKey?: string;
  packQuantity?: number;
};

export type CatalogAreaRate = {
  basePerM2: number;
  salePerM2: number;
  roundedPerM2: number;
  roundingMode: PricingRoundingMode;
};

export type PriceCatalog = {
  id: string;
  ruleCode: string;
  name: string;
  mode: CatalogPricingMode;
  roundingMode?: PricingRoundingMode;
  fixedSizes?: CatalogFixedSize[];
  areaRate?: CatalogAreaRate;
  piecePrices?: Array<{ key: string; label: string; salePrice: number }>;
};

export const POST_KESIM_OPTION_CODE = "POST_KESIM";
export const POST_KESIM_SURCHARGE = 100;

export const KIRLENT_PACK4_VARIANT = "PACK_4";

/** Kırlent 4'lü paket — optionCodes veya sizeVariantKey ile eşleşir */
export const CUSHION_PACK4_OPTION_CODES = [
  "pack4",
  "PACK4",
  "KIRLENT_4LU",
  KIRLENT_PACK4_VARIANT,
] as const;

function isCushionPack4Signal(
  sizeVariantKey?: string,
  codes?: string[]
): boolean {
  if (sizeVariantKey) {
    const key = sizeVariantKey.toUpperCase();
    if (
      key === KIRLENT_PACK4_VARIANT ||
      key.includes("PACK4") ||
      key.includes("PACK_4") ||
      key.endsWith("_4LU")
    ) {
      return true;
    }
  }
  if (!codes?.length) return false;
  return codes.some((c) =>
    CUSHION_PACK4_OPTION_CODES.some((p) => p.toLowerCase() === c.toLowerCase())
  );
}

function sizeKey(widthCm: number, heightCm: number, variantKey?: string): string {
  const w = Math.round(widthCm);
  const h = Math.round(heightCm);
  return variantKey ? `${w}x${h}:${variantKey}` : `${w}x${h}`;
}

function fixed(
  w: number,
  h: number,
  sale: number,
  label?: string,
  extra?: Partial<CatalogFixedSize>
): CatalogFixedSize {
  return {
    widthCm: w,
    heightCm: h,
    label: label || `${w}×${h} cm`,
    salePrice: sale,
    ...extra,
  };
}

export const POD_PRICE_CATALOGS: PriceCatalog[] = [
  {
    id: "CAM",
    ruleCode: "CAM_CATALOG_V1",
    name: "Cam Tablo",
    mode: "FIXED_SIZE",
    roundingMode: "NEAREST_1",
    fixedSizes: [
      fixed(90, 60, 1687),
      fixed(30, 45, 648),
      fixed(36, 23, 400),
      fixed(70, 46, 1087),
      fixed(105, 70, 2000),
      fixed(70, 23, 740),
      fixed(90, 30, 940),
      fixed(105, 35, 1125),
      fixed(120, 40, 1307),
      fixed(80, 120, 3400),
      fixed(30, 30, 600),
      fixed(40, 40, 740),
      fixed(50, 50, 900),
      fixed(60, 60, 1140),
      fixed(100, 100, 3000),
      fixed(30, 30, 600, "30×30 yuvarlak", { variantKey: "round" }),
      fixed(40, 40, 740, "40×40 yuvarlak", { variantKey: "round" }),
      fixed(50, 50, 900, "50×50 yuvarlak", { variantKey: "round" }),
      fixed(60, 60, 1140, "60×60 yuvarlak", { variantKey: "round" }),
    ],
  },
  {
    id: "MDF_TABLO",
    ruleCode: "MDF_TABLO_CATALOG_V1",
    name: "MDF Tablo",
    mode: "FIXED_SIZE",
    roundingMode: "NEAREST_1",
    fixedSizes: [
      fixed(20, 20, 93.6),
      fixed(20, 30, 116),
      fixed(25, 25, 127),
      fixed(30, 30, 127),
      fixed(25, 35, 130),
      fixed(30, 40, 135),
      fixed(30, 45, 145),
      fixed(30, 50, 162),
      fixed(35, 50, 170),
      fixed(35, 35, 172),
      fixed(40, 40, 192),
      fixed(45, 45, 213),
      fixed(50, 50, 222),
      fixed(40, 60, 260),
      fixed(50, 70, 276),
      fixed(80, 50, 371),
      fixed(50, 80, 371),
      fixed(90, 50, 374),
      fixed(80, 60, 374),
      fixed(50, 90, 374),
      fixed(60, 90, 380),
    ],
  },
  {
    id: "MDF_PUZZLE",
    ruleCode: "MDF_PUZZLE_CATALOG_V1",
    name: "MDF Puzzle",
    mode: "FIXED_SIZE",
    roundingMode: "NEAREST_1",
    fixedSizes: [
      fixed(30, 30, 207),
      fixed(20, 20, 190),
      fixed(50, 70, 453),
      fixed(50, 30, 264),
      fixed(50, 35, 276),
      fixed(35, 35, 250),
      fixed(25, 25, 161),
      fixed(15, 25, 117),
      fixed(0, 0, 67, "teona1", { variantKey: "teona1" }),
      fixed(0, 0, 453, "800 parça puzzle", { variantKey: "puzzle800" }),
    ],
  },
  {
    id: "PERDE",
    ruleCode: "CURTAIN_CATALOG_V1",
    name: "Perde",
    mode: "FIXED_SIZE",
    roundingMode: "NEAREST_1",
    fixedSizes: [
      fixed(280, 240, 1750, "280×240", { basePrice: 1400 }),
      fixed(280, 250, 1800, "280×250", { basePrice: 1440 }),
      fixed(280, 260, 1850, "280×260", { basePrice: 1480 }),
      fixed(280, 270, 1900, "280×270", { basePrice: 1520 }),
    ],
  },
  {
    id: "HALI",
    ruleCode: "CARPET_CATALOG_V1",
    name: "Halı",
    mode: "AREA_M2",
    roundingMode: "NEAREST_10",
    areaRate: {
      basePerM2: 270,
      salePerM2: 337.5,
      roundedPerM2: 340,
      roundingMode: "NEAREST_10",
    },
  },
  {
    id: "KIRLENT",
    ruleCode: "CUSHION_CATALOG_V1",
    name: "Kırlent",
    mode: "FIXED_SIZE",
    roundingMode: "NEAREST_5",
    fixedSizes: [
      fixed(43, 43, 80, "43×43 tekli", { basePrice: 62 }),
      fixed(50, 50, 105, "50×50 tekli", { basePrice: 82 }),
      fixed(60, 60, 115, "60×60 tekli", { basePrice: 90 }),
      fixed(43, 43, 320, "43×43 4'lü", { variantKey: KIRLENT_PACK4_VARIANT, packQuantity: 4 }),
      fixed(50, 50, 420, "50×50 4'lü", { variantKey: KIRLENT_PACK4_VARIANT, packQuantity: 4 }),
      fixed(60, 60, 460, "60×60 4'lü", { variantKey: KIRLENT_PACK4_VARIANT, packQuantity: 4 }),
    ],
  },
  {
    id: "NEVRESIM",
    ruleCode: "BEDDING_CATALOG_V1",
    name: "Nevresim Takımı",
    mode: "PIECE",
    roundingMode: "NEAREST_1",
    piecePrices: [
      { key: "single", label: "Tek kişilik nevresim takımı", salePrice: 1000 },
      { key: "double", label: "Çift kişilik nevresim takımı", salePrice: 1100 },
    ],
  },
];

const catalogByRuleCode = new Map(POD_PRICE_CATALOGS.map((c) => [c.ruleCode, c]));
const catalogById = new Map(POD_PRICE_CATALOGS.map((c) => [c.id, c]));

export function getPriceCatalogByRuleCode(ruleCode: string): PriceCatalog | undefined {
  return catalogByRuleCode.get(ruleCode);
}

export function getPriceCatalogById(id: string): PriceCatalog | undefined {
  return catalogById.get(id);
}

export function listCatalogFixedSizes(catalogId: string): CatalogFixedSize[] {
  return getPriceCatalogById(catalogId)?.fixedSizes || [];
}

export function resolveCatalogVariantKey(
  variantCodes?: string[],
  sizeVariantKey?: string,
  optionCodes?: string[]
): string | undefined {
  const packSignals = [...(variantCodes || []), ...(optionCodes || [])];

  if (isCushionPack4Signal(sizeVariantKey, packSignals)) {
    return KIRLENT_PACK4_VARIANT;
  }

  if (sizeVariantKey && sizeVariantKey !== "single") {
    return sizeVariantKey;
  }

  if (!variantCodes?.length) return undefined;

  if (variantCodes.includes("round")) return "round";
  if (variantCodes.includes("teona1")) return "teona1";
  if (variantCodes.includes("puzzle800")) return "puzzle800";
  if (variantCodes.includes("single") || variantCodes.includes("double")) {
    return variantCodes.find((v) => v === "single" || v === "double");
  }
  return variantCodes[0];
}

export type CatalogLookupInput = {
  ruleCode: string;
  catalogId?: string;
  widthCm?: number;
  heightCm?: number;
  quantity?: number;
  variantCodes?: string[];
  sizeVariantKey?: string;
  optionCodes?: string[];
  customerType?: "RETAIL" | "DEALER";
};

export type CatalogLookupResult = {
  catalogId: string;
  catalogName: string;
  matchType: "fixed" | "area" | "piece" | "none";
  sizeLabel: string;
  basePrice: number;
  salePrice: number;
  optionSurcharge: number;
  finalPrice: number;
  retailPrice: number;
  dealerPrice: number;
  areaM2: number;
  currency: string;
};

function applyPostKesim(optionCodes: string[] | undefined, price: number): number {
  if (!optionCodes?.includes(POST_KESIM_OPTION_CODE)) return price;
  return price + POST_KESIM_SURCHARGE;
}

function roundCatalogPrice(price: number, mode: PricingRoundingMode = "NEAREST_1"): number {
  return applyRounding(price, mode);
}

export function lookupCatalogPrice(input: CatalogLookupInput): CatalogLookupResult | null {
  const catalog =
    (input.catalogId ? getPriceCatalogById(input.catalogId) : undefined) ||
    getPriceCatalogByRuleCode(input.ruleCode);
  if (!catalog) return null;

  const variantKey = resolveCatalogVariantKey(
    input.variantCodes,
    input.sizeVariantKey,
    input.optionCodes
  );
  const w = Math.round(Number(input.widthCm) || 0);
  const h = Math.round(Number(input.heightCm) || 0);
  const qty = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const rounding = catalog.roundingMode || "NEAREST_1";

  let result: Omit<CatalogLookupResult, "optionSurcharge" | "finalPrice" | "retailPrice" | "dealerPrice"> & {
    rawSale: number;
  } | null = null;

  if (catalog.mode === "FIXED_SIZE" && catalog.fixedSizes?.length) {
    const special = catalog.fixedSizes.filter((s) => s.variantKey && (s.widthCm === 0 || s.heightCm === 0));
    if (variantKey && special.some((s) => s.variantKey === variantKey)) {
      const hit = special.find((s) => s.variantKey === variantKey)!;
      result = {
        catalogId: catalog.id,
        catalogName: catalog.name,
        matchType: "fixed",
        sizeLabel: hit.label,
        basePrice: hit.basePrice ?? hit.salePrice,
        salePrice: hit.salePrice,
        rawSale: hit.salePrice,
        areaM2: 0,
        currency: "TRY",
      };
    } else {
      const hit = catalog.fixedSizes.find(
        (s) =>
          s.widthCm === w &&
          s.heightCm === h &&
          (variantKey ? s.variantKey === variantKey : !s.variantKey)
      );
      if (hit) {
        result = {
          catalogId: catalog.id,
          catalogName: catalog.name,
          matchType: "fixed",
          sizeLabel: hit.label,
          basePrice: hit.basePrice ?? hit.salePrice,
          salePrice: hit.salePrice,
          rawSale: hit.salePrice,
          areaM2: (w * h) / 10000,
          currency: "TRY",
        };
      }
    }
  }

  if (!result && catalog.mode === "AREA_M2" && catalog.areaRate && w > 0 && h > 0) {
    const areaM2 = (w * h) / 10000;
    const perM2 = catalog.areaRate.roundedPerM2;
    const sale = roundCatalogPrice(areaM2 * perM2, catalog.areaRate.roundingMode);
    result = {
      catalogId: catalog.id,
      catalogName: catalog.name,
      matchType: "area",
      sizeLabel: `${w}×${h} cm`,
      basePrice: roundCatalogPrice(areaM2 * catalog.areaRate.basePerM2, catalog.areaRate.roundingMode),
      salePrice: sale,
      rawSale: sale,
      areaM2,
      currency: "TRY",
    };
  }

  if (!result && catalog.mode === "PIECE" && catalog.piecePrices?.length) {
    const key = variantKey || (qty > 1 ? "double" : "single");
    const hit = catalog.piecePrices.find((p) => p.key === key) || catalog.piecePrices[0];
    if (hit) {
      result = {
        catalogId: catalog.id,
        catalogName: catalog.name,
        matchType: "piece",
        sizeLabel: hit.label,
        basePrice: hit.salePrice,
        salePrice: hit.salePrice,
        rawSale: hit.salePrice,
        areaM2: 0,
        currency: "TRY",
      };
    }
  }

  if (!result) return null;

  const withOptions = applyPostKesim(input.optionCodes, result.rawSale);
  const optionSurcharge = withOptions - result.rawSale;
  const finalPrice = roundCatalogPrice(withOptions, rounding);

  return {
    catalogId: result.catalogId,
    catalogName: result.catalogName,
    matchType: result.matchType,
    sizeLabel: result.sizeLabel,
    basePrice: result.basePrice,
    salePrice: result.salePrice,
    optionSurcharge,
    finalPrice,
    retailPrice: finalPrice,
    dealerPrice: finalPrice,
    areaM2: result.areaM2,
    currency: result.currency,
  };
}

export function listAllCatalogSizeOptions(): Array<{
  catalogId: string;
  ruleCode: string;
  label: string;
  widthCm: number;
  heightCm: number;
  salePrice: number;
  variantKey?: string;
}> {
  const out: Array<{
    catalogId: string;
    ruleCode: string;
    label: string;
    widthCm: number;
    heightCm: number;
    salePrice: number;
    variantKey?: string;
  }> = [];
  for (const catalog of POD_PRICE_CATALOGS) {
    for (const s of catalog.fixedSizes || []) {
      out.push({
        catalogId: catalog.id,
        ruleCode: catalog.ruleCode,
        label: `${catalog.name} — ${s.label}`,
        widthCm: s.widthCm,
        heightCm: s.heightCm,
        salePrice: s.salePrice,
        variantKey: s.variantKey,
      });
    }
    for (const p of catalog.piecePrices || []) {
      out.push({
        catalogId: catalog.id,
        ruleCode: catalog.ruleCode,
        label: `${catalog.name} — ${p.label}`,
        widthCm: 0,
        heightCm: 0,
        salePrice: p.salePrice,
        variantKey: p.key,
      });
    }
  }
  return out;
}
