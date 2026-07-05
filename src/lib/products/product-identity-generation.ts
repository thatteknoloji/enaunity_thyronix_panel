export type VariantSkuGenerationMode = "unique" | "same_as_product";

export type ProductIdentityGenerationSettings = {
  enabled?: boolean;
  fillOnlyEmpty?: boolean;
  generateVariantBarcode?: boolean;
  variantSkuMode?: VariantSkuGenerationMode;
  skuPrefix?: string;
  barcodePrefix?: string;
};

export type VariantIdentityInput = {
  sku?: string;
  barcode?: string;
  options?: string | Array<{ group?: string; value?: string }>;
};

const DEFAULT_BARCODE_PREFIX = "29";

function text(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeCodeSegment(value: unknown, fallback = "URUN") {
  const normalized = text(value)
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİ]/g, "I")
    .replace(/[şŞ]/g, "S")
    .replace(/[ğĞ]/g, "G")
    .replace(/[üÜ]/g, "U")
    .replace(/[öÖ]/g, "O")
    .replace(/[çÇ]/g, "C")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return normalized || fallback;
}

function parseOptions(value: VariantIdentityInput["options"]) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function optionSuffix(variant: VariantIdentityInput, index: number) {
  const parts = parseOptions(variant.options)
    .map((option) => normalizeCodeSegment(option.value || option.group, ""))
    .filter(Boolean)
    .slice(0, 3);
  return parts.length > 0 ? parts.join("-") : `V${String(index + 1).padStart(2, "0")}`;
}

function hashToDigits(value: string, length: number) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let digits = String(Math.abs(hash));
  while (digits.length < length) {
    hash = Math.imul(hash ^ 0x9e3779b9, 16777619);
    digits += String(Math.abs(hash));
  }
  return digits.slice(0, length);
}

function ean13CheckDigit(firstTwelve: string) {
  const sum = firstTwelve
    .slice(0, 12)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function generateEan13(seed: string, prefix = DEFAULT_BARCODE_PREFIX) {
  const cleanPrefix = text(prefix).replace(/\D/g, "").slice(0, 6) || DEFAULT_BARCODE_PREFIX;
  const bodyLength = Math.max(1, 12 - cleanPrefix.length);
  const firstTwelve = `${cleanPrefix}${hashToDigits(seed, bodyLength)}`.slice(0, 12);
  return `${firstTwelve}${ean13CheckDigit(firstTwelve)}`;
}

export function buildVariantIdentityCodes(params: {
  baseSku?: string;
  baseModelCode?: string;
  productName?: string;
  variants: VariantIdentityInput[];
  settings?: ProductIdentityGenerationSettings;
}) {
  const settings = params.settings || {};
  const fillOnlyEmpty = settings.fillOnlyEmpty !== false;
  const base = normalizeCodeSegment(params.baseSku || params.baseModelCode || params.productName || "URUN");
  const skuPrefix = normalizeCodeSegment(settings.skuPrefix || base, base);
  const skuMode = settings.variantSkuMode || "unique";

  return params.variants.map((variant, index) => {
    const suffix = optionSuffix(variant, index);
    const sku =
      fillOnlyEmpty && text(variant.sku)
        ? text(variant.sku)
        : skuMode === "same_as_product"
          ? skuPrefix
          : `${skuPrefix}-${suffix}`.slice(0, 64);
    const barcode =
      fillOnlyEmpty && text(variant.barcode)
        ? text(variant.barcode)
        : settings.generateVariantBarcode === false
          ? text(variant.barcode)
          : generateEan13(`${base}|${suffix}|${index}`, settings.barcodePrefix);

    return {
      sku,
      barcode,
    };
  });
}

