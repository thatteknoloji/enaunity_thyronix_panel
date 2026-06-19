import { prisma } from "@/lib/db";
import type { ProductLibraryPaymentMethod } from "./gateway-config";
import type { PaymentProviderKey } from "./payment-types";

export type CardProvider = "ESNEKPOS" | "IYZICO" | "NONE";

export interface ProviderSettings {
  enabled: boolean;
  sandbox: boolean;
  configured: boolean;
  displayName: string;
  extraFeePercent: number;
  extraFeeFixed: number;
  installmentsEnabled: boolean;
  maxInstallments: number;
  minAmount: number;
}

export interface PaymentSettingsDTO {
  id: string;
  bankTransferEnabled: boolean;
  activeCardProvider: CardProvider;
  esnekpos: ProviderSettings;
  iyzico: ProviderSettings;
  checkoutTitle: string;
  checkoutDescription: string;
  require3ds: boolean;
  updatedAt: string;
}

export interface PublicPaymentSettings {
  methods: ProductLibraryPaymentMethod[];
  bankTransferEnabled: boolean;
  activeCardProvider: CardProvider;
  cardProvider: CardProvider;
  cardDisplayName: string;
  extraFeePercent: number;
  extraFeeFixed: number;
  installmentsEnabled: boolean;
  maxInstallments: number;
  minAmount: number;
  checkoutTitle: string;
  checkoutDescription: string;
}

const DEFAULT_ROW = {
  bankTransferEnabled: true,
  activeCardProvider: "NONE",
  esnekposEnabled: false,
  esnekposSandbox: true,
  esnekposMerchantId: "",
  esnekposMerchantKey: "",
  esnekposExtraFeePct: 0,
  esnekposExtraFeeFix: 0,
  esnekposInstallments: false,
  esnekposMaxInstall: 1,
  esnekposMinAmount: 0,
  esnekposDisplayName: "EsnekPOS",
  iyzicoEnabled: false,
  iyzicoSandbox: true,
  iyzicoApiKey: "",
  iyzicoSecretKey: "",
  iyzicoExtraFeePct: 0,
  iyzicoExtraFeeFix: 0,
  iyzicoInstallments: false,
  iyzicoMaxInstall: 1,
  iyzicoMinAmount: 0,
  iyzicoDisplayName: "İyzico",
  checkoutTitle: "Ödeme",
  checkoutDescription: "",
  require3ds: true,
};

function envEsnekEnabled() {
  return process.env.ESNEKPOS_ENABLED === "true";
}
function envIyzicoEnabled() {
  return process.env.IYZICO_ENABLED === "true";
}

function mergeEsnek(row: typeof DEFAULT_ROW): ProviderSettings {
  const merchantId = process.env.ESNEKPOS_MERCHANT_ID || process.env.ESNEKPOS_PUBLIC_TOKEN || row.esnekposMerchantId;
  const merchantKey = process.env.ESNEKPOS_SECRET || process.env.ESNEKPOS_MERCHANT_KEY || row.esnekposMerchantKey;
  const enabled = row.esnekposEnabled || envEsnekEnabled();
  const envSandbox = process.env.ESNEKPOS_SANDBOX;
  const sandbox = envSandbox !== undefined ? envSandbox === "true" : row.esnekposSandbox;
  return {
    enabled,
    sandbox,
    configured: Boolean(merchantId && merchantKey),
    displayName: row.esnekposDisplayName,
    extraFeePercent: row.esnekposExtraFeePct,
    extraFeeFixed: row.esnekposExtraFeeFix,
    installmentsEnabled: row.esnekposInstallments,
    maxInstallments: row.esnekposMaxInstall,
    minAmount: row.esnekposMinAmount,
  };
}

function mergeIyzico(row: typeof DEFAULT_ROW): ProviderSettings {
  const apiKey = process.env.IYZICO_API_KEY || row.iyzicoApiKey;
  const secretKey = process.env.IYZICO_SECRET_KEY || row.iyzicoSecretKey;
  const enabled = row.iyzicoEnabled || envIyzicoEnabled();
  return {
    enabled,
    sandbox: row.iyzicoSandbox || process.env.IYZICO_SANDBOX !== "false",
    configured: Boolean(apiKey && secretKey),
    displayName: row.iyzicoDisplayName,
    extraFeePercent: row.iyzicoExtraFeePct,
    extraFeeFixed: row.iyzicoExtraFeeFix,
    installmentsEnabled: row.iyzicoInstallments,
    maxInstallments: row.iyzicoMaxInstall,
    minAmount: row.iyzicoMinAmount,
  };
}

function resolveActiveCard(esnek: ProviderSettings, iyzico: ProviderSettings, preferred: CardProvider): CardProvider {
  if (preferred === "ESNEKPOS" && esnek.enabled && esnek.configured) return "ESNEKPOS";
  if (preferred === "IYZICO" && iyzico.enabled && iyzico.configured) return "IYZICO";
  if (esnek.enabled && esnek.configured) return "ESNEKPOS";
  if (iyzico.enabled && iyzico.configured) return "IYZICO";
  return "NONE";
}

function toDTO(row: typeof DEFAULT_ROW & { id: string; updatedAt: Date }): PaymentSettingsDTO {
  const esnekpos = mergeEsnek(row);
  const iyzico = mergeIyzico(row);
  const activeCardProvider = resolveActiveCard(
    esnekpos,
    iyzico,
    (row.activeCardProvider as CardProvider) || "NONE",
  );
  return {
    id: row.id,
    bankTransferEnabled: row.bankTransferEnabled,
    activeCardProvider,
    esnekpos,
    iyzico,
    checkoutTitle: row.checkoutTitle,
    checkoutDescription: row.checkoutDescription,
    require3ds: row.require3ds,
    updatedAt: row.updatedAt.toISOString(),
  };
}

let cache: PaymentSettingsDTO | null = null;
let cacheAt = 0;

export function invalidatePaymentSettingsCache() {
  cache = null;
  cacheAt = 0;
}

export async function getPaymentSettings(): Promise<PaymentSettingsDTO> {
  if (cache && Date.now() - cacheAt < 15_000) return cache;
  let row = await prisma.paymentGatewaySettings.findUnique({ where: { id: "default" } });
  if (!row) {
    row = await prisma.paymentGatewaySettings.create({ data: { id: "default", ...DEFAULT_ROW } });
  }
  cache = toDTO(row);
  cacheAt = Date.now();
  return cache;
}

export async function savePaymentSettings(input: Partial<PaymentSettingsDTO> & {
  esnekposMerchantId?: string;
  esnekposMerchantKey?: string;
  iyzicoApiKey?: string;
  iyzicoSecretKey?: string;
  esnekposEnabled?: boolean;
  iyzicoEnabled?: boolean;
  esnekposSandbox?: boolean;
  iyzicoSandbox?: boolean;
  esnekposExtraFeePct?: number;
  esnekposExtraFeeFix?: number;
  iyzicoExtraFeePct?: number;
  iyzicoExtraFeeFix?: number;
  esnekposInstallments?: boolean;
  iyzicoInstallments?: boolean;
  esnekposMaxInstall?: number;
  iyzicoMaxInstall?: number;
  esnekposMinAmount?: number;
  iyzicoMinAmount?: number;
  esnekposDisplayName?: string;
  iyzicoDisplayName?: string;
}) {
  const data: Record<string, unknown> = {};
  if (input.bankTransferEnabled !== undefined) data.bankTransferEnabled = input.bankTransferEnabled;
  if (input.activeCardProvider !== undefined) data.activeCardProvider = input.activeCardProvider;
  if (input.checkoutTitle !== undefined) data.checkoutTitle = input.checkoutTitle;
  if (input.checkoutDescription !== undefined) data.checkoutDescription = input.checkoutDescription;
  if (input.require3ds !== undefined) data.require3ds = input.require3ds;
  if (input.esnekposEnabled !== undefined) data.esnekposEnabled = input.esnekposEnabled;
  if (input.esnekposSandbox !== undefined) data.esnekposSandbox = input.esnekposSandbox;
  if (input.esnekposMerchantId !== undefined) data.esnekposMerchantId = input.esnekposMerchantId;
  if (input.esnekposMerchantKey !== undefined && input.esnekposMerchantKey !== "••••••••") {
    data.esnekposMerchantKey = input.esnekposMerchantKey;
  }
  if (input.esnekposExtraFeePct !== undefined) data.esnekposExtraFeePct = input.esnekposExtraFeePct;
  if (input.esnekposExtraFeeFix !== undefined) data.esnekposExtraFeeFix = input.esnekposExtraFeeFix;
  if (input.esnekposInstallments !== undefined) data.esnekposInstallments = input.esnekposInstallments;
  if (input.esnekposMaxInstall !== undefined) data.esnekposMaxInstall = input.esnekposMaxInstall;
  if (input.esnekposMinAmount !== undefined) data.esnekposMinAmount = input.esnekposMinAmount;
  if (input.esnekposDisplayName !== undefined) data.esnekposDisplayName = input.esnekposDisplayName;
  if (input.iyzicoEnabled !== undefined) data.iyzicoEnabled = input.iyzicoEnabled;
  if (input.iyzicoSandbox !== undefined) data.iyzicoSandbox = input.iyzicoSandbox;
  if (input.iyzicoApiKey !== undefined) data.iyzicoApiKey = input.iyzicoApiKey;
  if (input.iyzicoSecretKey !== undefined && input.iyzicoSecretKey !== "••••••••") {
    data.iyzicoSecretKey = input.iyzicoSecretKey;
  }
  if (input.iyzicoExtraFeePct !== undefined) data.iyzicoExtraFeePct = input.iyzicoExtraFeePct;
  if (input.iyzicoExtraFeeFix !== undefined) data.iyzicoExtraFeeFix = input.iyzicoExtraFeeFix;
  if (input.iyzicoInstallments !== undefined) data.iyzicoInstallments = input.iyzicoInstallments;
  if (input.iyzicoMaxInstall !== undefined) data.iyzicoMaxInstall = input.iyzicoMaxInstall;
  if (input.iyzicoMinAmount !== undefined) data.iyzicoMinAmount = input.iyzicoMinAmount;
  if (input.iyzicoDisplayName !== undefined) data.iyzicoDisplayName = input.iyzicoDisplayName;

  const row = await prisma.paymentGatewaySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...DEFAULT_ROW, ...data },
    update: data,
  });
  invalidatePaymentSettingsCache();
  return toDTO(row);
}

export async function getPublicPaymentSettings(): Promise<PublicPaymentSettings> {
  const s = await getPaymentSettings();
  const methods: ProductLibraryPaymentMethod[] = [];
  if (s.bankTransferEnabled) methods.push("BANK_TRANSFER");
  if (s.activeCardProvider === "ESNEKPOS") methods.push("ESNEKPOS");
  if (s.activeCardProvider === "IYZICO") methods.push("IYZICO");

  const card = s.activeCardProvider === "ESNEKPOS" ? s.esnekpos : s.iyzico;

  return {
    methods,
    bankTransferEnabled: s.bankTransferEnabled,
    activeCardProvider: s.activeCardProvider,
    cardProvider: s.activeCardProvider,
    cardDisplayName: card.displayName,
    extraFeePercent: card.extraFeePercent,
    extraFeeFixed: card.extraFeeFixed,
    installmentsEnabled: card.installmentsEnabled,
    maxInstallments: card.maxInstallments,
    minAmount: card.minAmount,
    checkoutTitle: s.checkoutTitle,
    checkoutDescription: s.checkoutDescription,
  };
}

export function calculatePaymentTotal(baseAmount: number, provider: CardProvider, settings: PaymentSettingsDTO): {
  baseAmount: number;
  feeAmount: number;
  totalAmount: number;
} {
  const p = provider === "ESNEKPOS" ? settings.esnekpos : settings.iyzico;
  const feeAmount = Math.round((baseAmount * (p.extraFeePercent / 100) + p.extraFeeFixed) * 100) / 100;
  return { baseAmount, feeAmount, totalAmount: Math.round((baseAmount + feeAmount) * 100) / 100 };
}

export async function getAvailablePaymentMethodsAsync(): Promise<ProductLibraryPaymentMethod[]> {
  const pub = await getPublicPaymentSettings();
  return pub.methods;
}

export async function resolveActiveProviderKey(): Promise<PaymentProviderKey> {
  const s = await getPaymentSettings();
  if (s.activeCardProvider === "ESNEKPOS") return "ESNEKPOS";
  if (s.activeCardProvider === "IYZICO") return "IYZICO";
  return "MANUAL";
}

export async function isProviderOperational(key: PaymentProviderKey): Promise<boolean> {
  const s = await getPaymentSettings();
  if (key === "ESNEKPOS") return s.activeCardProvider === "ESNEKPOS" && s.esnekpos.enabled && s.esnekpos.configured;
  if (key === "IYZICO") return s.activeCardProvider === "IYZICO" && s.iyzico.enabled && s.iyzico.configured;
  if (key === "MANUAL") return s.bankTransferEnabled;
  return false;
}

/** Admin DTO with masked secrets */
export async function getPaymentSettingsForAdmin() {
  const row = await prisma.paymentGatewaySettings.findUnique({ where: { id: "default" } });
  const dto = await getPaymentSettings();
  return {
    ...dto,
    esnekposMerchantId: row?.esnekposMerchantId || process.env.ESNEKPOS_MERCHANT_ID || "",
    esnekposMerchantKeyMasked: (row?.esnekposMerchantKey || process.env.ESNEKPOS_SECRET) ? "••••••••" : "",
    iyzicoApiKey: row?.iyzicoApiKey || process.env.IYZICO_API_KEY || "",
    iyzicoSecretKeyMasked: (row?.iyzicoSecretKey || process.env.IYZICO_SECRET_KEY) ? "••••••••" : "",
    envEsnekpos: envEsnekEnabled(),
    envIyzico: envIyzicoEnabled(),
    raw: row,
  };
}
