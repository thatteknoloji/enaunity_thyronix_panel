export const PRODUCT_TYPES = ["physical", "production", "dealer_transfer", "digital"] as const;
export const DIGITAL_DELIVERY_MODES = ["download", "license", "external_access", "manual"] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];
export type DigitalDeliveryMode = (typeof DIGITAL_DELIVERY_MODES)[number];

export type DigitalProductShape = {
  productType?: string | null;
  digitalDeliveryMode?: string | null;
  digitalAssetUrl?: string | null;
  digitalAssetName?: string | null;
  digitalAccessInstructions?: string | null;
  digitalDownloadLimit?: number | null;
  digitalLicenseTemplate?: string | null;
  digitalRequiresApproval?: boolean | null;
};

export type DigitalDeliverySnapshot = {
  isDigital: boolean;
  productType: ProductType;
  mode: DigitalDeliveryMode | "";
  assetUrl: string;
  assetName: string;
  instructions: string;
  downloadLimit: number;
  licenseTemplate: string;
  requiresApproval: boolean;
};

export function normalizeProductType(value: unknown): ProductType {
  const raw = String(value || "").trim().toLowerCase();
  return PRODUCT_TYPES.includes(raw as ProductType) ? (raw as ProductType) : "physical";
}

export function normalizeDigitalDeliveryMode(value: unknown): DigitalDeliveryMode | "" {
  const raw = String(value || "").trim().toLowerCase();
  return DIGITAL_DELIVERY_MODES.includes(raw as DigitalDeliveryMode) ? (raw as DigitalDeliveryMode) : "";
}

export function isDigitalProduct(product: Pick<DigitalProductShape, "productType"> | null | undefined) {
  return normalizeProductType(product?.productType) === "digital";
}

export function buildDigitalDeliverySnapshot(product: DigitalProductShape): DigitalDeliverySnapshot {
  const productType = normalizeProductType(product.productType);
  const isDigital = productType === "digital";
  const mode = isDigital ? normalizeDigitalDeliveryMode(product.digitalDeliveryMode) : "";
  return {
    isDigital,
    productType,
    mode,
    assetUrl: isDigital ? String(product.digitalAssetUrl || "").trim() : "",
    assetName: isDigital ? String(product.digitalAssetName || "").trim() : "",
    instructions: isDigital ? String(product.digitalAccessInstructions || "").trim() : "",
    downloadLimit: isDigital ? Math.max(0, Number(product.digitalDownloadLimit || 0) || 0) : 0,
    licenseTemplate: isDigital ? String(product.digitalLicenseTemplate || "").trim() : "",
    requiresApproval: isDigital ? Boolean(product.digitalRequiresApproval) : false,
  };
}

export function parseDigitalDeliverySnapshot(value: unknown): DigitalDeliverySnapshot | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (!source.isDigital && normalizeProductType(source.productType) !== "digital") return null;
  return {
    isDigital: true,
    productType: "digital",
    mode: normalizeDigitalDeliveryMode(source.mode),
    assetUrl: String(source.assetUrl || "").trim(),
    assetName: String(source.assetName || "").trim(),
    instructions: String(source.instructions || "").trim(),
    downloadLimit: Math.max(0, Number(source.downloadLimit || 0) || 0),
    licenseTemplate: String(source.licenseTemplate || "").trim(),
    requiresApproval: Boolean(source.requiresApproval),
  };
}

export function canUnlockDigitalDelivery(
  orderStatus: string,
  snapshot: Pick<DigitalDeliverySnapshot, "requiresApproval"> | null | undefined,
) {
  if (!snapshot) return false;
  if (["cancelled", "waiting_payment"].includes(orderStatus)) return false;
  if (snapshot.requiresApproval) {
    return ["approved", "pending", "shipped", "delivered"].includes(orderStatus);
  }
  return !["pending_approval"].includes(orderStatus);
}

export function digitalModeLabel(mode: string) {
  switch (normalizeDigitalDeliveryMode(mode)) {
    case "download":
      return "İndirme Dosyası";
    case "license":
      return "Lisans / Anahtar";
    case "external_access":
      return "Harici Erişim";
    case "manual":
      return "Manuel Teslim";
    default:
      return "Dijital Teslim";
  }
}
